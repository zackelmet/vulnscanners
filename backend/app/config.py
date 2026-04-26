from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    backend_host: str = "127.0.0.1"
    backend_port: int = 8080

    hetzner_scanner_auth_token: str = ""
    hetzner_webhook_secret: str = ""
    vercel_webhook_url: str = ""

    gcp_project_id: str = ""
    gcp_bucket_name: str = ""
    gcp_service_account_key: str = ""

    scan_concurrency: int = 2
    scan_timeout_seconds: int = 1800
    block_private_targets: bool = True

    zap_api_url: str = ""
    zap_api_key: str = ""
    nuclei_templates_dir: str = ""

    log_level: str = "INFO"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
