from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    host: str = Field("0.0.0.0", alias="HOST")
    port: int = Field(8080, alias="PORT")

    scanner_auth_token: str = Field(..., alias="HETZNER_SCANNER_AUTH_TOKEN")
    webhook_secret: str = Field(..., alias="HETZNER_WEBHOOK_SECRET")
    webhook_url: str = Field(..., alias="VERCEL_WEBHOOK_URL")

    gcp_bucket_name: str = Field("hosted-scanners-reports", alias="GCP_BUCKET_NAME")
    gcp_service_account_file: str | None = Field(
        None, alias="GOOGLE_APPLICATION_CREDENTIALS"
    )
    gcp_signed_url_ttl_seconds: int = Field(
        7 * 24 * 60 * 60, alias="GCP_SIGNED_URL_TTL_SECONDS"
    )

    max_concurrent_scans: int = Field(2, alias="MAX_CONCURRENT_SCANS")
    scan_timeout_seconds: int = Field(1800, alias="SCAN_TIMEOUT_SECONDS")

    nuclei_templates_dir: str | None = Field(None, alias="NUCLEI_TEMPLATES_DIR")
    zap_api_url: str = Field("http://zap:8090", alias="ZAP_API_URL")
    zap_api_key: str = Field("", alias="ZAP_API_KEY")

    allow_private_targets: bool = Field(False, alias="ALLOW_PRIVATE_TARGETS")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
