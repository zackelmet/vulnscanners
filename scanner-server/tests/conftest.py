import os

os.environ.setdefault("HETZNER_SCANNER_AUTH_TOKEN", "test-token")
os.environ.setdefault("HETZNER_WEBHOOK_SECRET", "test-secret")
os.environ.setdefault("VERCEL_WEBHOOK_URL", "https://example.test/api/scans/webhook")
os.environ.setdefault("GCP_BUCKET_NAME", "unit-test-bucket")
os.environ.setdefault("ALLOW_PRIVATE_TARGETS", "true")
