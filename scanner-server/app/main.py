import logging
from contextlib import asynccontextmanager
from typing import Any, Literal

from fastapi import Depends, FastAPI, HTTPException, status
from pydantic import BaseModel, Field

from .auth import require_scanner_token
from .queue import ScanJob, get_pool

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


class ScanRequest(BaseModel):
    scanId: str = Field(..., min_length=1, max_length=128)
    scanner: Literal["nmap", "nuclei", "zap"]
    target: str = Field(..., min_length=1, max_length=2048)
    options: dict[str, Any] = Field(default_factory=dict)
    userId: str = Field(..., min_length=1, max_length=128)


@asynccontextmanager
async def lifespan(app: FastAPI):
    from .queue import reset_pool

    reset_pool()
    await get_pool().start()
    try:
        yield
    finally:
        await get_pool().stop()
        reset_pool()


app = FastAPI(title="VulnScanners Worker", lifespan=lifespan)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/scan", status_code=status.HTTP_202_ACCEPTED)
async def enqueue_scan(
    body: ScanRequest,
    _: None = Depends(require_scanner_token),
) -> dict[str, Any]:
    job = ScanJob(
        scan_id=body.scanId,
        user_id=body.userId,
        scanner_type=body.scanner,
        target=body.target,
        options=body.options or {},
    )
    position = await get_pool().submit(job)
    return {
        "accepted": True,
        "scanId": body.scanId,
        "queue_position": position,
    }


@app.post("/scan/validate")
async def validate(
    body: ScanRequest,
    _: None = Depends(require_scanner_token),
) -> dict[str, Any]:
    from .validation import (
        TargetValidationError,
        validate_network_target,
        validate_url_target,
    )
    try:
        if body.scanner == "zap":
            normalized = validate_url_target(body.target)
        else:
            normalized = validate_network_target(body.target)
    except TargetValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return {"ok": True, "target": normalized}
