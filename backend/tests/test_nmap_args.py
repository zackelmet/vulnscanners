import pytest

from app.scanners.base import ScannerError
from app.scanners.nmap import _build_args


def test_quick_profile():
    args = _build_args("example.com", {"scanProfile": "quick"})
    assert args[-1] == "example.com"
    assert "-F" in args


def test_unknown_profile_rejected():
    with pytest.raises(ScannerError):
        _build_args("example.com", {"scanProfile": "bogus"})


def test_invalid_timing_rejected():
    with pytest.raises(ScannerError):
        _build_args("example.com", {"scanProfile": "quick", "timing": "T9"})


def test_ports_validated():
    with pytest.raises(ScannerError):
        _build_args("example.com", {"scanProfile": "quick", "ports": "80; rm -rf /"})


def test_custom_flag_must_start_with_dash():
    with pytest.raises(ScannerError):
        _build_args("example.com", {"scanProfile": "custom", "customFlags": "evil"})


def test_custom_flags_tokenised_safely():
    args = _build_args(
        "example.com",
        {"scanProfile": "custom", "customFlags": "-sV --top-ports 100"},
    )
    assert "-sV" in args and "--top-ports" in args and "100" in args
