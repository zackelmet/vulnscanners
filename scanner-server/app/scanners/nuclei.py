import json
import re
from pathlib import Path
from typing import Any

from ..config import get_settings
from .base import ScanArtifacts, ScanError, Scanner, run_subprocess

_ALLOWED_SEVERITIES = {"info", "low", "medium", "high", "critical", "unknown"}
_TEMPLATE_RE = re.compile(r"^[A-Za-z0-9_\-/\.]+$")


def _normalize_severity(value: Any) -> str | None:
    if not value:
        return None
    parts = [p.strip().lower() for p in str(value).split(",") if p.strip()]
    bad = [p for p in parts if p not in _ALLOWED_SEVERITIES]
    if bad:
        raise ScanError(f"invalid severity: {bad}")
    return ",".join(parts) if parts else None


def _summarize(findings: list[dict[str, Any]]) -> dict[str, Any]:
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0}
    top: list[dict[str, Any]] = []
    for f in findings:
        info = f.get("info") or {}
        sev = str(info.get("severity", "info")).lower()
        if sev in counts:
            counts[sev] += 1
        if len(top) < 50:
            top.append({
                "templateId": f.get("template-id") or f.get("templateID"),
                "name": info.get("name"),
                "severity": sev,
                "matchedAt": f.get("matched-at") or f.get("matched"),
                "type": f.get("type"),
            })
    return {"counts": counts, "total": len(findings), "findings": top}


class NucleiScanner(Scanner):
    scanner_type = "nuclei"

    async def run(self, *, scan_id, target, options, workdir, timeout):
        options = options or {}
        jsonl_path = workdir / "nuclei.jsonl"
        summary_path = workdir / "nuclei-summary.json"

        cmd = [
            "nuclei",
            "-u", target,
            "-jsonl",
            "-o", str(jsonl_path),
            "-silent",
            "-no-color",
            "-disable-update-check",
        ]

        sev = _normalize_severity(options.get("severity"))
        if sev:
            cmd += ["-severity", sev]

        tmpl_dir = get_settings().nuclei_templates_dir
        if tmpl_dir:
            cmd += ["-t", tmpl_dir]

        templates = options.get("templates")
        if templates:
            for t in str(templates).split(","):
                t = t.strip()
                if not t:
                    continue
                if not _TEMPLATE_RE.match(t):
                    raise ScanError(f"invalid template: {t}")
                cmd += ["-t", t]

        code, _stdout, stderr = await run_subprocess(cmd, timeout=timeout, cwd=workdir)
        # nuclei exits 0 both when findings exist and when none do; non-zero is a real error
        if code != 0:
            raise ScanError(f"nuclei exited {code}: {stderr.decode(errors='replace')[:500]}")

        findings: list[dict[str, Any]] = []
        if jsonl_path.exists():
            for line in jsonl_path.read_text(encoding="utf-8", errors="replace").splitlines():
                line = line.strip()
                if not line:
                    continue
                try:
                    findings.append(json.loads(line))
                except json.JSONDecodeError:
                    continue

        summary = _summarize(findings)
        summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

        # Ensure primary JSONL exists even if empty so upload doesn't fail
        if not jsonl_path.exists():
            jsonl_path.write_text("", encoding="utf-8")

        return ScanArtifacts(
            scan_id=scan_id,
            scanner_type=self.scanner_type,
            target=target,
            summary=summary,
            primary_path=summary_path,
            primary_content_type="application/json",
            xml_path=jsonl_path,
            xml_content_type="application/x-ndjson",
        )
