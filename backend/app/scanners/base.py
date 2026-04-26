from dataclasses import dataclass, field
from typing import Any


class ScannerError(RuntimeError):
    """Raised when a scanner subprocess fails in an unrecoverable way."""


@dataclass
class ScannerArtifact:
    object_path: str
    data: bytes
    content_type: str


@dataclass
class ScannerResult:
    summary: dict[str, Any] = field(default_factory=dict)
    raw_json: bytes = b""  # canonical machine-readable output (uploaded to GCS)
    raw_xml: bytes | None = None  # nmap-style XML, optional
    billing_units: int = 1
    artifacts: list[ScannerArtifact] = field(default_factory=list)
