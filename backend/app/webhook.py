import asyncio
import logging
from typing import Any

import httpx

from .config import get_settings

logger = logging.getLogger(__name__)


async def post_result(payload: dict[str, Any]) -> None:
    settings = get_settings()
    url = settings.vercel_webhook_url
    if not url:
        logger.warning("VERCEL_WEBHOOK_URL not set; skipping callback for %s", payload.get("scanId"))
        return

    headers = {
        "content-type": "application/json",
        "x-hetzner-webhook-secret": settings.hetzner_webhook_secret,
    }

    timeout = httpx.Timeout(connect=10.0, read=30.0, write=30.0, pool=30.0)
    last_err: Exception | None = None

    async with httpx.AsyncClient(timeout=timeout) as client:
        for attempt in range(1, 5):
            try:
                resp = await client.post(url, headers=headers, json=payload)
                if resp.status_code < 400:
                    logger.info(
                        "webhook posted scan=%s status=%s http=%s",
                        payload.get("scanId"),
                        payload.get("status"),
                        resp.status_code,
                    )
                    return
                logger.error(
                    "webhook rejected scan=%s http=%s body=%s",
                    payload.get("scanId"),
                    resp.status_code,
                    resp.text[:300],
                )
                if 400 <= resp.status_code < 500 and resp.status_code != 429:
                    return  # don't retry permanent client errors
                last_err = RuntimeError(f"webhook http {resp.status_code}")
            except httpx.HTTPError as exc:
                last_err = exc
                logger.warning("webhook attempt %d failed: %s", attempt, exc)

            if attempt < 4:
                await asyncio.sleep(2 ** attempt)

    logger.error("webhook permanently failed for scan=%s: %s", payload.get("scanId"), last_err)
