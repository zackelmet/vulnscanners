import asyncio
import logging
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

from .config import get_settings
from .scanners import ScannerError, ScannerResult, run_nmap, run_nuclei, run_zap
from .storage import signed_url, upload_bytes
from .webhook import post_result

logger = logging.getLogger(__name__)


@dataclass
class ScanJob:
    scan_id: str
    user_id: str
    scanner: str  # "nmap" | "nuclei" | "zap"
    target: str
    options: dict[str, Any]
    enqueued_at: float


class ScanQueue:
    def __init__(self) -> None:
        self._queue: asyncio.Queue[ScanJob] = asyncio.Queue()
        self._workers: list[asyncio.Task] = []
        self._inflight: dict[str, ScanJob] = {}
        self._stopping = False

    async def start(self) -> None:
        concurrency = max(1, get_settings().scan_concurrency)
        for i in range(concurrency):
            self._workers.append(asyncio.create_task(self._worker(i)))
        logger.info("scan queue started with %d workers", concurrency)

    async def stop(self) -> None:
        self._stopping = True
        for w in self._workers:
            w.cancel()
        for w in self._workers:
            try:
                await w
            except (asyncio.CancelledError, Exception):
                pass

    async def submit(self, job: ScanJob) -> int:
        await self._queue.put(job)
        return self._queue.qsize()

    def stats(self) -> dict[str, Any]:
        return {
            "queued": self._queue.qsize(),
            "inflight": len(self._inflight),
            "workers": len(self._workers),
        }

    async def _worker(self, worker_id: int) -> None:
        logger.info("worker %d started", worker_id)
        while not self._stopping:
            job = await self._queue.get()
            self._inflight[job.scan_id] = job
            try:
                await self._process(job)
            except Exception:
                logger.exception("worker %d crashed handling %s", worker_id, job.scan_id)
            finally:
                self._inflight.pop(job.scan_id, None)
                self._queue.task_done()

    async def _process(self, job: ScanJob) -> None:
        settings = get_settings()
        timeout = settings.scan_timeout_seconds
        started = time.monotonic()
        logger.info(
            "starting scan id=%s scanner=%s target=%s",
            job.scan_id,
            job.scanner,
            job.target,
        )

        try:
            if job.scanner == "nmap":
                result = await run_nmap(target=job.target, options=job.options, timeout=timeout)
            elif job.scanner == "nuclei":
                result = await run_nuclei(target=job.target, options=job.options, timeout=timeout)
            elif job.scanner == "zap":
                result = await run_zap(target=job.target, options=job.options, timeout=timeout)
            else:
                raise ScannerError(f"unsupported scanner: {job.scanner}")
        except ScannerError as exc:
            elapsed = time.monotonic() - started
            logger.error("scan %s failed in %.1fs: %s", job.scan_id, elapsed, exc)
            await post_result(
                {
                    "scanId": job.scan_id,
                    "userId": job.user_id,
                    "scannerType": job.scanner,
                    "status": "failed",
                    "errorMessage": str(exc),
                    "billingUnits": 0,
                }
            )
            return
        except Exception as exc:
            elapsed = time.monotonic() - started
            logger.exception("scan %s crashed in %.1fs", job.scan_id, elapsed)
            await post_result(
                {
                    "scanId": job.scan_id,
                    "userId": job.user_id,
                    "scannerType": job.scanner,
                    "status": "failed",
                    "errorMessage": f"internal error: {exc.__class__.__name__}",
                    "billingUnits": 0,
                }
            )
            return

        await self._upload_and_callback(job, result, started)

    async def _upload_and_callback(
        self, job: ScanJob, result: ScannerResult, started: float
    ) -> None:
        payload: dict[str, Any] = {
            "scanId": job.scan_id,
            "userId": job.user_id,
            "scannerType": job.scanner,
            "status": "completed",
            "resultsSummary": result.summary,
            "billingUnits": result.billing_units,
        }

        try:
            base_path = f"{job.user_id}/{job.scanner}/{job.scan_id}"

            json_path = f"{base_path}.json"
            json_url = upload_bytes(
                object_path=json_path,
                data=result.raw_json,
                content_type="application/json",
                metadata={"scanId": job.scan_id, "userId": job.user_id},
            )
            payload["gcpStorageUrl"] = json_url
            json_signed = signed_url(json_path)
            if json_signed:
                payload["gcpSignedUrl"] = json_signed
                payload["gcpSignedUrlExpires"] = (
                    datetime.now(timezone.utc) + timedelta(days=7)
                ).isoformat()

            if result.raw_xml:
                xml_path = f"{base_path}.xml"
                xml_url = upload_bytes(
                    object_path=xml_path,
                    data=result.raw_xml,
                    content_type="application/xml",
                    metadata={"scanId": job.scan_id, "userId": job.user_id},
                )
                payload["gcpXmlStorageUrl"] = xml_url
                xml_signed = signed_url(xml_path)
                if xml_signed:
                    payload["gcpXmlSignedUrl"] = xml_signed
                    payload["gcpXmlSignedUrlExpires"] = (
                        datetime.now(timezone.utc) + timedelta(days=7)
                    ).isoformat()

            for art in result.artifacts:
                upload_bytes(
                    object_path=art.object_path,
                    data=art.data,
                    content_type=art.content_type,
                    metadata={"scanId": job.scan_id, "userId": job.user_id},
                )
        except Exception as exc:
            logger.exception("upload failed for scan %s", job.scan_id)
            payload["status"] = "failed"
            payload["errorMessage"] = f"result upload failed: {exc}"
            payload["billingUnits"] = 0

        elapsed = time.monotonic() - started
        logger.info(
            "scan %s finished in %.1fs status=%s",
            job.scan_id,
            elapsed,
            payload["status"],
        )
        await post_result(payload)


_queue: ScanQueue | None = None


def get_queue() -> ScanQueue:
    global _queue
    if _queue is None:
        _queue = ScanQueue()
    return _queue
