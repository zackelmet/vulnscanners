import asyncio
import logging
import shutil
import tempfile
from contextlib import suppress
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .callback import post_webhook
from .config import get_settings
from .scanners import ScanError, get_scanner
from .storage import upload_file
from .validation import (
    TargetValidationError,
    validate_network_target,
    validate_url_target,
)

log = logging.getLogger(__name__)


@dataclass
class ScanJob:
    scan_id: str
    user_id: str
    scanner_type: str
    target: str
    options: dict[str, Any]


class ScanWorkerPool:
    """Bounded in-process worker pool. Good enough for a single-VPS deployment."""

    def __init__(self) -> None:
        cfg = get_settings()
        self._queue: asyncio.Queue[ScanJob] | None = None
        self._workers: list[asyncio.Task[None]] = []
        self._concurrency = max(1, cfg.max_concurrent_scans)

    async def start(self) -> None:
        # Create the queue inside the running loop so it binds correctly.
        self._queue = asyncio.Queue()
        for i in range(self._concurrency):
            self._workers.append(asyncio.create_task(self._run(i), name=f"scan-worker-{i}"))
        log.info("worker pool started concurrency=%s", self._concurrency)

    async def stop(self) -> None:
        for w in self._workers:
            w.cancel()
        for w in self._workers:
            with suppress(asyncio.CancelledError):
                await w
        self._workers.clear()
        self._queue = None

    async def submit(self, job: ScanJob) -> int:
        if self._queue is None:
            raise RuntimeError("worker pool not started")
        await self._queue.put(job)
        return self._queue.qsize()

    async def _run(self, idx: int) -> None:
        assert self._queue is not None
        queue = self._queue
        while True:
            job = await queue.get()
            try:
                await _execute_job(job)
            except Exception:  # pragma: no cover - guard the loop
                log.exception("worker %s crashed on scan=%s", idx, job.scan_id)
            finally:
                queue.task_done()


async def _execute_job(job: ScanJob) -> None:
    cfg = get_settings()
    log.info("starting scan=%s type=%s", job.scan_id, job.scanner_type)

    try:
        if job.scanner_type == "zap":
            target = validate_url_target(job.target)
        else:
            target = validate_network_target(job.target)
    except TargetValidationError as exc:
        await _deliver_failure(job, str(exc))
        return

    workdir = Path(tempfile.mkdtemp(prefix=f"scan-{job.scan_id}-"))
    try:
        scanner = get_scanner(job.scanner_type)
        artifacts = await scanner.run(
            scan_id=job.scan_id,
            target=target,
            options=job.options,
            workdir=workdir,
            timeout=cfg.scan_timeout_seconds,
        )

        payload: dict[str, Any] = {
            "scanId": job.scan_id,
            "userId": job.user_id,
            "scannerType": job.scanner_type,
            "status": "completed",
            "resultsSummary": artifacts.summary,
            "billingUnits": artifacts.billing_units,
        }

        primary = upload_file(
            artifacts.primary_path,
            _remote_path(job, artifacts.primary_path),
            artifacts.primary_content_type,
        )
        payload["gcpStorageUrl"] = primary.gs_url
        payload["gcpSignedUrl"] = primary.signed_url
        payload["gcpSignedUrlExpires"] = primary.signed_url_expires

        if artifacts.xml_path:
            xml = upload_file(
                artifacts.xml_path,
                _remote_path(job, artifacts.xml_path),
                artifacts.xml_content_type,
            )
            payload["gcpXmlStorageUrl"] = xml.gs_url
            payload["gcpXmlSignedUrl"] = xml.signed_url
            payload["gcpXmlSignedUrlExpires"] = xml.signed_url_expires

        if artifacts.report_path:
            rep = upload_file(
                artifacts.report_path,
                _remote_path(job, artifacts.report_path),
                artifacts.report_content_type,
            )
            payload["gcpReportStorageUrl"] = rep.gs_url
            payload["gcpReportSignedUrl"] = rep.signed_url
            payload["gcpReportSignedUrlExpires"] = rep.signed_url_expires

        await post_webhook(payload)
        log.info("completed scan=%s", job.scan_id)
    except ScanError as exc:
        log.warning("scan failed scan=%s err=%s", job.scan_id, exc)
        await _deliver_failure(job, str(exc))
    except Exception as exc:
        log.exception("scan crashed scan=%s", job.scan_id)
        await _deliver_failure(job, f"internal error: {exc}")
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


def _remote_path(job: ScanJob, local: Path) -> str:
    return f"{job.user_id}/{job.scanner_type}/{job.scan_id}/{local.name}"


async def _deliver_failure(job: ScanJob, message: str) -> None:
    await post_webhook({
        "scanId": job.scan_id,
        "userId": job.user_id,
        "scannerType": job.scanner_type,
        "status": "failed",
        "errorMessage": message,
        "billingUnits": 0,
    })


_pool: ScanWorkerPool | None = None


def get_pool() -> ScanWorkerPool:
    global _pool
    if _pool is None:
        _pool = ScanWorkerPool()
    return _pool


def reset_pool() -> None:
    """For tests — drop the singleton so the next lifespan builds a fresh one."""
    global _pool
    _pool = None
