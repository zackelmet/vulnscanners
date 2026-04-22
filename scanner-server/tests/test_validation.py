import os

import pytest

os.environ["ALLOW_PRIVATE_TARGETS"] = "false"

from app.config import get_settings  # noqa: E402
from app.validation import (  # noqa: E402
    TargetValidationError,
    validate_network_target,
    validate_url_target,
)


def setup_module(_):
    get_settings.cache_clear()


def test_network_strips_protocol_and_path():
    assert validate_network_target("http://scanme.nmap.org/foo:80") == "scanme.nmap.org"


def test_network_accepts_ip():
    assert validate_network_target("8.8.8.8") == "8.8.8.8"


def test_network_rejects_private_ip():
    with pytest.raises(TargetValidationError):
        validate_network_target("10.0.0.1")


def test_network_rejects_loopback():
    with pytest.raises(TargetValidationError):
        validate_network_target("127.0.0.1")


def test_network_rejects_junk():
    with pytest.raises(TargetValidationError):
        validate_network_target("not a host!!!")


def test_url_adds_scheme():
    assert validate_url_target("example.com/path").startswith("http://example.com")


def test_url_rejects_private():
    with pytest.raises(TargetValidationError):
        validate_url_target("http://192.168.1.1/admin")
