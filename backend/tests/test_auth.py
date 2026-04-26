import pytest
from fastapi import HTTPException

from app.auth import require_scanner_token
from app.config import get_settings


@pytest.fixture(autouse=True)
def _env(monkeypatch):
    get_settings.cache_clear()
    monkeypatch.setenv("HETZNER_SCANNER_AUTH_TOKEN", "expected-secret")
    yield
    get_settings.cache_clear()


def test_missing_header_rejected():
    with pytest.raises(HTTPException) as exc:
        require_scanner_token(None)
    assert exc.value.status_code == 401


def test_wrong_token_rejected():
    with pytest.raises(HTTPException) as exc:
        require_scanner_token("nope")
    assert exc.value.status_code == 401


def test_correct_token_accepted():
    assert require_scanner_token("expected-secret") is None


def test_empty_config_rejected(monkeypatch):
    monkeypatch.setenv("HETZNER_SCANNER_AUTH_TOKEN", "")
    get_settings.cache_clear()
    with pytest.raises(HTTPException) as exc:
        require_scanner_token("expected-secret")
    assert exc.value.status_code == 500
