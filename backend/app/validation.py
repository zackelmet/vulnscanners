import ipaddress
import re
import socket
from urllib.parse import urlparse

from .config import get_settings

ScannerType = str  # "nmap" | "nuclei" | "zap"

_HOSTNAME_RE = re.compile(
    r"^(?=.{1,253}$)([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)"
    r"(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
)


class TargetValidationError(ValueError):
    pass


def _is_blocked_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _resolve_and_check(host: str) -> None:
    if not get_settings().block_private_targets:
        return
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise TargetValidationError(f"could not resolve host: {host}") from exc

    for info in infos:
        sockaddr = info[4]
        ip_str = sockaddr[0]
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if _is_blocked_ip(ip):
            raise TargetValidationError(
                f"target {host} resolves to blocked address {ip_str}"
            )


def normalize_target(scanner: ScannerType, raw: str) -> str:
    if not isinstance(raw, str) or not raw.strip():
        raise TargetValidationError("target must be a non-empty string")

    target = raw.strip()

    if scanner == "zap":
        if not re.match(r"^https?://", target, re.IGNORECASE):
            target = f"http://{target}"
        try:
            parsed = urlparse(target)
        except ValueError as exc:
            raise TargetValidationError(f"invalid URL: {raw}") from exc
        if not parsed.hostname:
            raise TargetValidationError(f"invalid URL (no host): {raw}")
        _validate_host_token(parsed.hostname)
        _resolve_and_check(parsed.hostname)
        return target

    # nmap, nuclei: strip protocol/port/path, keep hostname or IP
    target = re.sub(r"^https?://", "", target, flags=re.IGNORECASE)
    target = target.split("/", 1)[0]
    target = target.split(":", 1)[0]
    _validate_host_token(target)
    _resolve_and_check(target)
    return target


def _validate_host_token(token: str) -> None:
    try:
        ip = ipaddress.ip_address(token)
    except ValueError:
        ip = None

    if ip is not None:
        if get_settings().block_private_targets and _is_blocked_ip(ip):
            raise TargetValidationError(f"blocked IP literal: {token}")
        return

    if not _HOSTNAME_RE.match(token):
        raise TargetValidationError(f"invalid hostname: {token}")
