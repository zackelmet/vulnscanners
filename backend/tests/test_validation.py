import pytest

from app.config import get_settings
from app.validation import TargetValidationError, normalize_target


@pytest.fixture(autouse=True)
def _enable_blocking(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("BLOCK_PRIVATE_TARGETS", "true")
    monkeypatch.setenv("HETZNER_SCANNER_AUTH_TOKEN", "test-token")
    yield
    get_settings.cache_clear()


def test_nmap_strips_protocol_and_port(monkeypatch):
    monkeypatch.setattr("app.validation._resolve_and_check", lambda host: None)
    assert normalize_target("nmap", "https://example.com:8443/foo") == "example.com"


def test_nuclei_strips_protocol(monkeypatch):
    monkeypatch.setattr("app.validation._resolve_and_check", lambda host: None)
    assert normalize_target("nuclei", "http://example.com/x") == "example.com"


def test_zap_keeps_url_and_adds_scheme(monkeypatch):
    monkeypatch.setattr("app.validation._resolve_and_check", lambda host: None)
    assert normalize_target("zap", "example.com").startswith("http://example.com")


def test_blocks_rfc1918_ip_literal():
    with pytest.raises(TargetValidationError):
        normalize_target("nmap", "10.0.0.1")


def test_blocks_loopback_literal():
    with pytest.raises(TargetValidationError):
        normalize_target("nmap", "127.0.0.1")


def test_blocks_link_local():
    with pytest.raises(TargetValidationError):
        normalize_target("nmap", "169.254.1.1")


def test_invalid_hostname_rejected():
    with pytest.raises(TargetValidationError):
        normalize_target("nmap", "not a host!!")


def test_empty_target_rejected():
    with pytest.raises(TargetValidationError):
        normalize_target("nmap", "   ")
