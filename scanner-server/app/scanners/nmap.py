import json
import re
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

from .base import ScanArtifacts, ScanError, Scanner, run_subprocess

_PROFILES: dict[str, list[str]] = {
    "quick": ["-T4", "-F"],
    "standard": ["-T4", "-sV", "--top-ports", "1000"],
    "full": ["-T4", "-sV", "-sC", "-p-"],
    "custom": [],
}

_SAFE_PORT_RE = re.compile(r"^[0-9,\-]+$")
_SAFE_TIMING_RE = re.compile(r"^T[0-5]$")
_SAFE_FLAG_RE = re.compile(r"^-[A-Za-z0-9\-]+(=[A-Za-z0-9_,\-\./]+)?$")


def _build_args(options: dict[str, Any]) -> list[str]:
    profile = (options.get("scanProfile") or "standard").lower()
    args = list(_PROFILES.get(profile, _PROFILES["standard"]))

    ports = options.get("ports")
    if ports:
        if not _SAFE_PORT_RE.match(str(ports)):
            raise ScanError(f"invalid ports option: {ports}")
        args += ["-p", str(ports)]

    timing = options.get("timing")
    if timing:
        if not _SAFE_TIMING_RE.match(str(timing)):
            raise ScanError(f"invalid timing option: {timing}")
        args += [f"-{timing}"]

    if profile == "custom":
        for flag in (options.get("customFlags") or "").split():
            if not _SAFE_FLAG_RE.match(flag):
                raise ScanError(f"rejected custom flag: {flag}")
            args.append(flag)

    return args


def _parse_xml_summary(xml_path: Path) -> dict[str, Any]:
    try:
        tree = ET.parse(xml_path)
    except ET.ParseError:
        return {"hosts": [], "error": "failed to parse nmap XML"}

    root = tree.getroot()
    hosts_summary: list[dict[str, Any]] = []
    total_open = 0
    hosts_up = 0
    for host in root.findall("host"):
        status_el = host.find("status")
        state = status_el.get("state") if status_el is not None else "unknown"
        if state == "up":
            hosts_up += 1
        addr_el = host.find("address")
        ip = addr_el.get("addr") if addr_el is not None else ""
        port_entries: list[dict[str, Any]] = []
        ports_el = host.find("ports")
        if ports_el is not None:
            for port in ports_el.findall("port"):
                s = port.find("state")
                if s is None or s.get("state") != "open":
                    continue
                total_open += 1
                service = port.find("service")
                port_entries.append({
                    "port": int(port.get("portid", "0")),
                    "protocol": port.get("protocol", ""),
                    "service": service.get("name") if service is not None else None,
                    "product": service.get("product") if service is not None else None,
                    "version": service.get("version") if service is not None else None,
                })
        hosts_summary.append({"ip": ip, "state": state, "openPorts": port_entries})

    return {
        "hosts": hosts_summary,
        "totalHosts": len(hosts_summary),
        "hostsUp": hosts_up,
        "openPorts": total_open,
    }


class NmapScanner(Scanner):
    scanner_type = "nmap"

    async def run(self, *, scan_id, target, options, workdir, timeout):
        xml_path = workdir / "nmap.xml"
        json_path = workdir / "nmap.json"
        args = _build_args(options or {})

        cmd = ["nmap", "-oX", str(xml_path), *args, target]
        code, _stdout, stderr = await run_subprocess(cmd, timeout=timeout, cwd=workdir)
        if code != 0:
            raise ScanError(f"nmap exited {code}: {stderr.decode(errors='replace')[:500]}")

        summary = _parse_xml_summary(xml_path)
        json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

        return ScanArtifacts(
            scan_id=scan_id,
            scanner_type=self.scanner_type,
            target=target,
            summary=summary,
            primary_path=json_path,
            primary_content_type="application/json",
            xml_path=xml_path,
            xml_content_type="application/xml",
        )
