import logging
from typing import Any

import httpx

from .config import get_settings

log = logging.getLogger(__name__)


async def post_webhook(payload: dict[str, Any]) -> None:
    cfg = get_settings()
    headers = {
        "Content-Type": "application/json",
        "X-Hetzner-Webhook-Secret": cfg.webhook_secret,
    }

    last_err: Exception | None = None
    backoff = 2.0
    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(1, 5):
            try:
                resp = await client.post(cfg.webhook_url, json=payload, headers=headers)
                if resp.is_success:
                    log.info("webhook delivered for scan=%s status=%s", payload.get("scanId"), resp.status_code)
                    return
                log.warning(
                    "webhook non-2xx attempt=%s status=%s body=%s",
                    attempt,
                    resp.status_code,
                    resp.text[:500],
                )
            except Exception as exc:  # pragma: no cover - best-effort network
                last_err = exc
                log.warning("webhook error attempt=%s err=%s", attempt, exc)
            if attempt < 4:
                import asyncio

                await asyncio.sleep(backoff)
                backoff *= 2
    log.error("webhook failed after retries scan=%s err=%s", payload.get("scanId"), last_err)
