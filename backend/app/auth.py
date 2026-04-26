import hmac

from fastapi import Header, HTTPException, status

from .config import get_settings


def require_scanner_token(x_scanner_token: str | None = Header(default=None)) -> None:
    expected = get_settings().hetzner_scanner_auth_token
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="HETZNER_SCANNER_AUTH_TOKEN is not configured on the worker",
        )
    if not x_scanner_token or not hmac.compare_digest(x_scanner_token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="invalid X-Scanner-Token",
        )
