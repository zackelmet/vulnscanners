import base64
import json
import logging
from datetime import timedelta
from typing import Any

from google.cloud import storage
from google.oauth2 import service_account

from .config import get_settings

logger = logging.getLogger(__name__)

_client: storage.Client | None = None
_credentials: service_account.Credentials | None = None


def _load_credentials() -> service_account.Credentials | None:
    global _credentials
    if _credentials is not None:
        return _credentials
    raw = get_settings().gcp_service_account_key
    if not raw:
        return None
    try:
        decoded = base64.b64decode(raw).decode("utf-8")
        info = json.loads(decoded)
    except Exception as exc:
        raise RuntimeError(f"GCP_SERVICE_ACCOUNT_KEY is not valid base64 JSON: {exc}")
    _credentials = service_account.Credentials.from_service_account_info(info)
    return _credentials


def get_client() -> storage.Client:
    global _client
    if _client is not None:
        return _client
    creds = _load_credentials()
    project = get_settings().gcp_project_id or None
    if creds is not None:
        _client = storage.Client(project=project, credentials=creds)
    else:
        # Fall back to ADC (e.g. workload identity, gcloud login).
        _client = storage.Client(project=project)
    return _client


def _bucket() -> storage.Bucket:
    bucket_name = get_settings().gcp_bucket_name
    if not bucket_name:
        raise RuntimeError("GCP_BUCKET_NAME is not configured")
    return get_client().bucket(bucket_name)


def upload_bytes(
    *,
    object_path: str,
    data: bytes,
    content_type: str,
    metadata: dict[str, Any] | None = None,
) -> str:
    blob = _bucket().blob(object_path)
    if metadata:
        blob.metadata = {k: str(v) for k, v in metadata.items()}
    blob.upload_from_string(data, content_type=content_type)
    gcs_url = f"gs://{_bucket().name}/{object_path}"
    logger.info("uploaded %s (%d bytes)", gcs_url, len(data))
    return gcs_url


def signed_url(object_path: str, expires_in: timedelta = timedelta(days=7)) -> str | None:
    blob = _bucket().blob(object_path)
    creds = _load_credentials()
    try:
        return blob.generate_signed_url(
            version="v4",
            expiration=expires_in,
            method="GET",
            credentials=creds,
        )
    except Exception:
        logger.exception("signed_url generation failed for %s", object_path)
        return None
