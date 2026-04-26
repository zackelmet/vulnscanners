import asyncio
import json
import logging
import os
import shlex
import tempfile
from typing import Any
from urllib.parse import urlparse

import httpx

from ..config import get_settings
from .base import ScannerError, ScannerResult

logger = logging.getLogger(__name__)

_PROFILES = {"quick", "active", "full"}


def _resolve_profile(options: dict[str, Any]) -> str:
    profile = (options.get("scanProfile") or options.get("scanType") or "quick").lower()
    if profile not in _PROFILES:
        raise ScannerError(f"invalid zap profile: {profile}")
    return profile


def _summarize(report: dict[str, Any]) -> dict[str, Any]:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    sites = report.get("site") if isinstance(report, dict) else []
    if isinstance(sites, dict):
        sites = [sites]
    total = 0
    for site in sites or []:
        for alert in site.get("alerts", []) or []:
            total += 1
            risk = (alert.get("riskdesc") or alert.get("risk") or "").lower()
            if "critical" in risk:
                counts["critical"] += 1
            elif "high" in risk:
                counts["high"] += 1
            elif "medium" in risk:
                counts["medium"] += 1
            elif "low" in risk:
                counts["low"] += 1
            else:
                counts["info"] += 1
    return {"totalFindings": total, "vulnerabilities": counts}


async def _run_via_api(target: str, profile: str, timeout: int) -> ScannerResult:
    settings = get_settings()
    base = settings.zap_api_url.rstrip("/")
    api_key = settings.zap_api_key
    params_common = {"apikey": api_key} if api_key else {}

    async with httpx.AsyncClient(timeout=httpx.Timeout(30.0)) as client:
        # Spider
        r = await client.get(
            f"{base}/JSON/spider/action/scan/",
            params={**params_common, "url": target},
        )
        r.raise_for_status()
        spider_id = r.json().get("scan")

        deadline = asyncio.get_event_loop().time() + timeout
        while True:
            if asyncio.get_event_loop().time() > deadline:
                raise ScannerError("zap spider timed out")
            r = await client.get(
                f"{base}/JSON/spider/view/status/",
                params={**params_common, "scanId": spider_id},
            )
            r.raise_for_status()
            if r.json().get("status") == "100":
                break
            await asyncio.sleep(2)

        if profile in ("active", "full"):
            r = await client.get(
                f"{base}/JSON/ascan/action/scan/",
                params={**params_common, "url": target},
            )
            r.raise_for_status()
            ascan_id = r.json().get("scan")
            while True:
                if asyncio.get_event_loop().time() > deadline:
                    raise ScannerError("zap active scan timed out")
                r = await client.get(
                    f"{base}/JSON/ascan/view/status/",
                    params={**params_common, "scanId": ascan_id},
                )
                r.raise_for_status()
                if r.json().get("status") == "100":
                    break
                await asyncio.sleep(5)

        # Pull JSON report
        r = await client.get(f"{base}/OTHER/core/other/jsonreport/", params=params_common)
        r.raise_for_status()
        report_bytes = r.content
        try:
            report = json.loads(report_bytes)
        except json.JSONDecodeError:
            report = {}

    summary = _summarize(report)
    payload = {
        "target": target,
        "profile": profile,
        "summary": summary,
        "report": report,
    }
    return ScannerResult(
        summary=summary,
        raw_json=json.dumps(payload, indent=2).encode("utf-8"),
        billing_units=1,
    )


async def _run_via_cli(target: str, profile: str, timeout: int) -> ScannerResult:
    # Uses the official zap2docker baseline / full-scan helper if installed,
    # otherwise falls back to `zap.sh`.
    with tempfile.TemporaryDirectory(prefix="zap-") as tmp:
        report_json = os.path.join(tmp, "report.json")

        if profile == "quick":
            argv = ["zap-baseline.py", "-t", target, "-J", report_json]
        else:
            argv = ["zap-full-scan.py", "-t", target, "-J", report_json]

        logger.info("zap exec: %s", " ".join(shlex.quote(a) for a in argv))
        try:
            proc = await asyncio.create_subprocess_exec(
                *argv,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
        except FileNotFoundError as exc:
            raise ScannerError(
                "no ZAP binary found; install zap2docker or set ZAP_API_URL"
            ) from exc

        try:
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise ScannerError(f"zap timed out after {timeout}s")

        # zap-baseline.py exits non-zero when findings are present; not fatal.
        report: dict[str, Any] = {}
        if os.path.exists(report_json):
            try:
                with open(report_json, "rb") as f:
                    report = json.loads(f.read())
            except json.JSONDecodeError:
                report = {}
        elif proc.returncode and proc.returncode > 2:
            raise ScannerError(
                f"zap exited {proc.returncode}: {stderr.decode(errors='replace')[:500]}"
            )

        summary = _summarize(report)
        payload = {
            "target": target,
            "profile": profile,
            "summary": summary,
            "report": report,
        }
        return ScannerResult(
            summary=summary,
            raw_json=json.dumps(payload, indent=2).encode("utf-8"),
            billing_units=1,
        )


async def run_zap(*, target: str, options: dict[str, Any], timeout: int) -> ScannerResult:
    parsed = urlparse(target)
    if parsed.scheme not in ("http", "https"):
        raise ScannerError(f"zap requires an http(s) URL, got: {target}")

    profile = _resolve_profile(options)
    if get_settings().zap_api_url:
        return await _run_via_api(target, profile, timeout)
    return await _run_via_cli(target, profile, timeout)
