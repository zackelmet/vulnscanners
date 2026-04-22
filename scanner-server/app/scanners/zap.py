import asyncio
import json
import time
from pathlib import Path
from typing import Any

import httpx

from ..config import get_settings
from .base import ScanArtifacts, ScanError, Scanner

_SCAN_PROFILES = {"quick", "active", "full"}


class ZapScanner(Scanner):
    """
    Talks to an OWASP ZAP daemon over its REST API.
    Expects ZAP running (see docker-compose) at ZAP_API_URL with ZAP_API_KEY.
    """

    scanner_type = "zap"

    async def run(self, *, scan_id, target, options, workdir, timeout):
        options = options or {}
        profile = (options.get("scanProfile") or options.get("scanType") or "quick").lower()
        if profile not in _SCAN_PROFILES:
            raise ScanError(f"invalid zap scanProfile: {profile}")

        cfg = get_settings()
        base = cfg.zap_api_url.rstrip("/")
        api_key = cfg.zap_api_key

        async with httpx.AsyncClient(timeout=60.0) as client:
            deadline = time.monotonic() + timeout

            # Spider
            spider_id = await _call(
                client, base, "spider/action/scan",
                {"apikey": api_key, "url": target, "recurse": "true"},
            )
            spider_id = spider_id.get("scan")
            await _poll(client, base, "spider/view/status", {"apikey": api_key, "scanId": spider_id}, deadline)

            if profile in ("active", "full"):
                ascan_id = await _call(
                    client, base, "ascan/action/scan",
                    {"apikey": api_key, "url": target, "recurse": "true",
                     "inScopeOnly": "false"},
                )
                ascan_id = ascan_id.get("scan")
                await _poll(client, base, "ascan/view/status", {"apikey": api_key, "scanId": ascan_id}, deadline)

            alerts = await _call(client, base, "core/view/alerts", {"apikey": api_key, "baseurl": target}, method="GET")
            html_report = await _raw(client, base, "OTHER/core/other/htmlreport", {"apikey": api_key}, method="GET")

        alerts_list = alerts.get("alerts", []) if isinstance(alerts, dict) else []
        counts = {"High": 0, "Medium": 0, "Low": 0, "Informational": 0}
        for a in alerts_list:
            risk = a.get("risk", "Informational")
            counts[risk] = counts.get(risk, 0) + 1

        summary = {
            "counts": {
                "critical": 0,
                "high": counts.get("High", 0),
                "medium": counts.get("Medium", 0),
                "low": counts.get("Low", 0),
                "info": counts.get("Informational", 0),
            },
            "total": len(alerts_list),
            "alerts": [
                {
                    "name": a.get("name"),
                    "risk": a.get("risk"),
                    "confidence": a.get("confidence"),
                    "url": a.get("url"),
                    "param": a.get("param"),
                    "cweid": a.get("cweid"),
                    "wascid": a.get("wascid"),
                }
                for a in alerts_list[:50]
            ],
        }

        json_path = workdir / "zap-alerts.json"
        json_path.write_text(json.dumps({"summary": summary, "alerts": alerts_list}, indent=2), encoding="utf-8")

        html_path = workdir / "zap-report.html"
        html_path.write_bytes(html_report)

        return ScanArtifacts(
            scan_id=scan_id,
            scanner_type=self.scanner_type,
            target=target,
            summary=summary,
            primary_path=json_path,
            primary_content_type="application/json",
            report_path=html_path,
            report_content_type="text/html",
        )


async def _call(client: httpx.AsyncClient, base: str, path: str, params: dict, method: str = "GET") -> dict:
    url = f"{base}/JSON/{path}/"
    resp = await client.request(method, url, params=params)
    if resp.status_code != 200:
        raise ScanError(f"zap {path} failed {resp.status_code}: {resp.text[:200]}")
    try:
        return resp.json()
    except Exception as exc:
        raise ScanError(f"zap {path} bad json: {exc}")


async def _raw(client: httpx.AsyncClient, base: str, path: str, params: dict, method: str = "GET") -> bytes:
    url = f"{base}/{path}/"
    resp = await client.request(method, url, params=params)
    if resp.status_code != 200:
        raise ScanError(f"zap {path} failed {resp.status_code}")
    return resp.content


async def _poll(client: httpx.AsyncClient, base: str, path: str, params: dict, deadline: float) -> None:
    while True:
        if time.monotonic() > deadline:
            raise ScanError(f"zap {path} timed out")
        data = await _call(client, base, path, params)
        status = data.get("status", "0")
        try:
            if int(status) >= 100:
                return
        except ValueError:
            pass
        await asyncio.sleep(3)
