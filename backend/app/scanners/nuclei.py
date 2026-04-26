import asyncio
import json
import logging
import os
import re
import shlex
import tempfile
from typing import Any

from ..config import get_settings
from .base import ScannerError, ScannerResult

logger = logging.getLogger(__name__)

_VALID_SEVERITIES = {"info", "low", "medium", "high", "critical"}
_TEMPLATE_PATH_RE = re.compile(r"^[a-zA-Z0-9._\-/]+$")


def _build_args(target: str, options: dict[str, Any], jsonl_path: str) -> list[str]:
    argv: list[str] = ["nuclei", "-u", target, "-jsonl", "-o", jsonl_path, "-silent", "-no-color"]

    severity = (options.get("severity") or "").strip()
    if severity:
        parts = [s.strip().lower() for s in severity.split(",") if s.strip()]
        for s in parts:
            if s not in _VALID_SEVERITIES:
                raise ScannerError(f"invalid severity: {s}")
        argv.extend(["-severity", ",".join(parts)])

    templates = (options.get("templates") or "").strip()
    if templates:
        for tok in templates.split(","):
            tok = tok.strip()
            if not tok:
                continue
            if not _TEMPLATE_PATH_RE.match(tok):
                raise ScannerError(f"invalid template path: {tok}")
            argv.extend(["-t", tok])

    tdir = get_settings().nuclei_templates_dir
    if tdir:
        argv.extend(["-templates-dir", tdir])

    return argv


def _summarize(findings: list[dict[str, Any]]) -> dict[str, Any]:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    for f in findings:
        sev = (f.get("info", {}).get("severity") or "info").lower()
        if sev in counts:
            counts[sev] += 1
    return {
        "totalFindings": len(findings),
        "vulnerabilities": counts,
    }


async def run_nuclei(*, target: str, options: dict[str, Any], timeout: int) -> ScannerResult:
    with tempfile.TemporaryDirectory(prefix="nuclei-") as tmp:
        jsonl_path = os.path.join(tmp, "out.jsonl")
        argv = _build_args(target, options, jsonl_path)

        logger.info("nuclei exec: %s", " ".join(shlex.quote(a) for a in argv))
        proc = await asyncio.create_subprocess_exec(
            *argv,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            _, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise ScannerError(f"nuclei timed out after {timeout}s")

        # nuclei returns 0 on success even when no findings; non-zero on real errors
        if proc.returncode not in (0,):
            raise ScannerError(
                f"nuclei exited {proc.returncode}: {stderr.decode(errors='replace')[:500]}"
            )

        findings: list[dict[str, Any]] = []
        if os.path.exists(jsonl_path):
            with open(jsonl_path, "r", encoding="utf-8", errors="replace") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    try:
                        findings.append(json.loads(line))
                    except json.JSONDecodeError:
                        continue

        summary = _summarize(findings)
        json_payload = {
            "target": target,
            "options": options,
            "summary": summary,
            "findings": findings,
        }

        return ScannerResult(
            summary=summary,
            raw_json=json.dumps(json_payload, indent=2).encode("utf-8"),
            billing_units=1,
        )
