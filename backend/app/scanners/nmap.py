import asyncio
import json
import logging
import os
import re
import shlex
import tempfile
from typing import Any
from xml.etree import ElementTree as ET

from .base import ScannerError, ScannerResult

logger = logging.getLogger(__name__)

_PROFILES = {
    "quick": ["-T4", "-F"],
    "standard": ["-T4", "-sV", "--top-ports", "1000"],
    "full": ["-T4", "-sV", "-p-", "--script=default,vuln"],
}

_VALID_TIMING = {"T0", "T1", "T2", "T3", "T4", "T5"}
_PORTS_RE = re.compile(r"^[0-9,\-]+$")


def _build_args(target: str, options: dict[str, Any]) -> list[str]:
    profile = (options.get("scanProfile") or "standard").lower()
    args: list[str] = []

    if profile == "custom":
        custom = options.get("customFlags") or ""
        # Disallow shell metacharacters, only accept whitelisted nmap flags.
        for tok in shlex.split(custom):
            if not tok.startswith("-"):
                raise ScannerError(f"custom flag must start with '-': {tok}")
            args.append(tok)
    elif profile in _PROFILES:
        args.extend(_PROFILES[profile])
    else:
        raise ScannerError(f"unknown nmap profile: {profile}")

    timing = options.get("timing")
    if timing:
        if timing not in _VALID_TIMING:
            raise ScannerError(f"invalid timing: {timing}")
        args.append(f"-{timing}")

    ports = options.get("ports")
    if ports:
        if not _PORTS_RE.match(str(ports)):
            raise ScannerError(f"invalid ports spec: {ports}")
        args.extend(["-p", str(ports)])

    args.append(target)
    return args


def _parse_xml(xml_bytes: bytes) -> dict[str, Any]:
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return {"hostsUp": 0, "totalPorts": 0, "openPorts": 0, "hosts": []}

    hosts_up = 0
    total_ports = 0
    open_ports = 0
    hosts: list[dict[str, Any]] = []

    for host in root.findall("host"):
        state_el = host.find("status")
        state = state_el.attrib.get("state") if state_el is not None else "unknown"
        if state == "up":
            hosts_up += 1

        addr_el = host.find("address")
        ip = addr_el.attrib.get("addr") if addr_el is not None else None
        hostname_el = host.find("hostnames/hostname")
        hostname = hostname_el.attrib.get("name") if hostname_el is not None else None

        port_list: list[dict[str, Any]] = []
        for p in host.findall("ports/port"):
            total_ports += 1
            pstate = p.find("state")
            pstate_val = pstate.attrib.get("state") if pstate is not None else "unknown"
            if pstate_val == "open":
                open_ports += 1
            svc = p.find("service")
            port_list.append(
                {
                    "port": int(p.attrib.get("portid", "0")),
                    "protocol": p.attrib.get("protocol", "tcp"),
                    "state": pstate_val,
                    "service": svc.attrib.get("name") if svc is not None else None,
                    "version": svc.attrib.get("version") if svc is not None else None,
                }
            )

        hosts.append(
            {
                "ip": ip,
                "hostname": hostname,
                "state": state,
                "ports": port_list,
            }
        )

    return {
        "totalHosts": len(hosts),
        "hostsUp": hosts_up,
        "totalPorts": total_ports,
        "openPorts": open_ports,
        "hosts": hosts,
    }


async def run_nmap(*, target: str, options: dict[str, Any], timeout: int) -> ScannerResult:
    with tempfile.TemporaryDirectory(prefix="nmap-") as tmp:
        xml_path = os.path.join(tmp, "out.xml")
        argv = ["nmap", "-oX", xml_path] + _build_args(target, options)

        logger.info("nmap exec: %s", " ".join(shlex.quote(a) for a in argv))
        proc = await asyncio.create_subprocess_exec(
            *argv,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        try:
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        except asyncio.TimeoutError:
            proc.kill()
            await proc.wait()
            raise ScannerError(f"nmap timed out after {timeout}s")

        if proc.returncode != 0:
            raise ScannerError(
                f"nmap exited {proc.returncode}: {stderr.decode(errors='replace')[:500]}"
            )

        try:
            with open(xml_path, "rb") as f:
                xml_bytes = f.read()
        except FileNotFoundError:
            xml_bytes = b""

        summary = _parse_xml(xml_bytes)
        json_payload = {
            "target": target,
            "options": options,
            "summary": summary,
            "stdout": stdout.decode(errors="replace"),
        }

        return ScannerResult(
            summary=summary,
            raw_json=json.dumps(json_payload, indent=2).encode("utf-8"),
            raw_xml=xml_bytes,
            billing_units=1,
        )
