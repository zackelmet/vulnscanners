import logging
import time
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from . import __version__
from .auth import require_scanner_token
from .config import get_settings
from .queue import ScanJob, get_queue
from .validation import TargetValidationError, normalize_target

logger = logging.getLogger(__name__)


class ScanRequest(BaseModel):
    scanId: str = Field(min_length=1, max_length=128)
    scanner: Literal["nmap", "nuclei", "zap"]
    target: str = Field(min_length=1, max_length=2048)
    options: dict[str, Any] = Field(default_factory=dict)
    userId: str = Field(min_length=1, max_length=128)


class ScanResponse(BaseModel):
    accepted: bool
    scan_id: str
    queue_position: int


def _configure_logging() -> None:
    settings = get_settings()
    logging.basicConfig(
        level=getattr(logging, settings.log_level.upper(), logging.INFO),
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    _configure_logging()
    queue = get_queue()
    await queue.start()
    logger.info("vulnscanners backend %s started", __version__)
    try:
        yield
    finally:
        await queue.stop()


app = FastAPI(
    title="vulnscanners backend",
    version=__version__,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
    lifespan=lifespan,
)


@app.get("/health")
async def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "version": __version__,
        "uptime_epoch": time.time(),
        "queue": get_queue().stats(),
    }


@app.get("/version")
async def version() -> dict[str, str]:
    return {"version": __version__}


@app.post(
    "/scan",
    response_model=ScanResponse,
    dependencies=[Depends(require_scanner_token)],
)
async def submit_scan(req: ScanRequest) -> ScanResponse:
    try:
        normalized = normalize_target(req.scanner, req.target)
    except TargetValidationError as exc:
        logger.warning("rejected scan %s: %s", req.scanId, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"invalid target: {exc}",
        )

    job = ScanJob(
        scan_id=req.scanId,
        user_id=req.userId,
        scanner=req.scanner,
        target=normalized,
        options=req.options,
        enqueued_at=time.time(),
    )
    position = await get_queue().submit(job)
    logger.info(
        "queued scan id=%s scanner=%s target=%s position=%d",
        req.scanId,
        req.scanner,
        normalized,
        position,
    )
    return ScanResponse(accepted=True, scan_id=req.scanId, queue_position=position)
