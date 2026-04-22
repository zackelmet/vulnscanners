import ipaddress
import re
import socket
from urllib.parse import urlparse

from .config import get_settings

_DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)"
    r"(?:\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))*$"
)


class TargetValidationError(ValueError):
    pass


def _is_disallowed_ip(ip: ipaddress._BaseAddress) -> bool:
    return (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    )


def _resolve_host(host: str) -> list[ipaddress._BaseAddress]:
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise TargetValidationError(f"could not resolve host: {host}") from exc
    ips: list[ipaddress._BaseAddress] = []
    for info in infos:
        sockaddr = info[4]
        if not sockaddr:
            continue
        try:
            ips.append(ipaddress.ip_address(sockaddr[0]))
        except ValueError:
            continue
    return ips


def _ensure_public(host: str) -> None:
    if get_settings().allow_private_targets:
        return
    try:
        ip = ipaddress.ip_address(host)
        ips = [ip]
    except ValueError:
        ips = _resolve_host(host)
    if not ips:
        raise TargetValidationError(f"no addresses for host: {host}")
    for ip in ips:
        if _is_disallowed_ip(ip):
            raise TargetValidationError(
                f"target {host} resolves to disallowed address {ip}"
            )


def validate_network_target(target: str) -> str:
    """For nmap and nuclei: strip protocol/path/port, return bare host."""
    cleaned = target.strip()
    cleaned = re.sub(r"^https?://", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"/.*$", "", cleaned)
    cleaned = re.sub(r":\d+$", "", cleaned)

    if not cleaned:
        raise TargetValidationError("empty target")

    try:
        ipaddress.ip_address(cleaned)
    except ValueError:
        if not _DOMAIN_RE.match(cleaned):
            raise TargetValidationError(f"invalid host: {cleaned}")

    _ensure_public(cleaned)
    return cleaned


def validate_url_target(target: str) -> str:
    """For zap: require http(s) URL, return normalized URL."""
    cleaned = target.strip()
    if not re.match(r"^https?://", cleaned, flags=re.IGNORECASE):
        cleaned = f"http://{cleaned}"
    parsed = urlparse(cleaned)
    if parsed.scheme not in ("http", "https") or not parsed.hostname:
        raise TargetValidationError(f"invalid URL: {target}")
    _ensure_public(parsed.hostname)
    return cleaned
