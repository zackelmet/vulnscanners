from .base import ScanArtifacts, ScanError, Scanner
from .nmap import NmapScanner
from .nuclei import NucleiScanner
from .zap import ZapScanner


def get_scanner(scan_type: str) -> Scanner:
    if scan_type == "nmap":
        return NmapScanner()
    if scan_type == "nuclei":
        return NucleiScanner()
    if scan_type == "zap":
        return ZapScanner()
    raise ScanError(f"unknown scanner: {scan_type}")


__all__ = [
    "ScanArtifacts",
    "ScanError",
    "Scanner",
    "get_scanner",
]
