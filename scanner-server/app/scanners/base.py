import asyncio
import logging
import shlex
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)


class ScanError(RuntimeError):
    pass


@dataclass
class ScanArtifacts:
    """Files and metadata produced by a scanner run."""

    scan_id: str
    scanner_type: str
    target: str
    summary: dict[str, Any]
    # primary (human) result -- usually JSON
    primary_path: Path
    primary_content_type: str = "application/json"
    # optional raw/XML result
    xml_path: Path | None = None
    xml_content_type: str = "application/xml"
    # optional PDF report
    report_path: Path | None = None
    report_content_type: str = "application/pdf"
    billing_units: int = 1
    error_message: str | None = None
    extra_files: list[tuple[Path, str]] = field(default_factory=list)


class Scanner:
    scanner_type: str = ""

    async def run(
        self,
        *,
        scan_id: str,
        target: str,
        options: dict[str, Any],
        workdir: Path,
        timeout: int,
    ) -> ScanArtifacts:
        raise NotImplementedError


async def run_subprocess(
    cmd: list[str],
    *,
    timeout: int,
    cwd: Path | None = None,
) -> tuple[int, bytes, bytes]:
    log.info("exec: %s", shlex.join(cmd))
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        cwd=str(cwd) if cwd else None,
    )
    try:
        stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
    except asyncio.TimeoutError as exc:
        proc.kill()
        await proc.wait()
        raise ScanError(f"timed out after {timeout}s: {cmd[0]}") from exc
    return proc.returncode or 0, stdout, stderr
