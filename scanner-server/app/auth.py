import hmac

from fastapi import Header, HTTPException, status

from .config import get_settings


def require_scanner_token(x_scanner_token: str | None = Header(default=None)) -> None:
    expected = get_settings().scanner_auth_token
    if not x_scanner_token or not hmac.compare_digest(x_scanner_token, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing X-Scanner-Token",
        )
