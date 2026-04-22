import datetime
import logging
import mimetypes
from dataclasses import dataclass
from pathlib import Path

from google.cloud import storage
from google.oauth2 import service_account

from .config import get_settings

log = logging.getLogger(__name__)


@dataclass
class UploadResult:
    gs_url: str
    signed_url: str
    signed_url_expires: str


_client: storage.Client | None = None


def _get_client() -> storage.Client:
    global _client
    if _client is not None:
        return _client
    cfg = get_settings()
    if cfg.gcp_service_account_file:
        creds = service_account.Credentials.from_service_account_file(
            cfg.gcp_service_account_file
        )
        _client = storage.Client(credentials=creds, project=creds.project_id)
    else:
        _client = storage.Client()
    return _client


def upload_file(local_path: Path, remote_path: str, content_type: str | None = None) -> UploadResult:
    cfg = get_settings()
    client = _get_client()
    bucket = client.bucket(cfg.gcp_bucket_name)
    blob = bucket.blob(remote_path)

    guessed = content_type or mimetypes.guess_type(str(local_path))[0] or "application/octet-stream"
    blob.upload_from_filename(str(local_path), content_type=guessed)

    expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(
        seconds=cfg.gcp_signed_url_ttl_seconds
    )
    signed = blob.generate_signed_url(
        version="v4",
        expiration=expires_at,
        method="GET",
    )
    return UploadResult(
        gs_url=f"gs://{cfg.gcp_bucket_name}/{remote_path}",
        signed_url=signed,
        signed_url_expires=expires_at.isoformat(),
    )
