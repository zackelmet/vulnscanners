# VulnScanners Scanner Worker

Backend scanner service that runs on a Hetzner VPS. Receives scan dispatch from
the Vercel web app, executes `nmap` / `nuclei` / OWASP `zap`, uploads artifacts
to GCS, and calls back to `VERCEL_WEBHOOK_URL`.

Contract is defined in `../docs/API_CONTRACT.md`; runtime decisions in
`../docs/HETZNER.md`.

## Architecture

```
Vercel  ──POST /scan──▶  Caddy (TLS) ──▶  FastAPI (uvicorn) ──▶  asyncio worker pool
                                                                    │
                                                                    ├─▶ nmap (subprocess)
                                                                    ├─▶ nuclei (subprocess)
                                                                    └─▶ zaproxy (REST, sidecar container)
                                                                    │
                                                               GCS upload + signed URLs
                                                                    │
                                         Vercel ◀──POST /api/scans/webhook──┘
```

- FastAPI on `:8080`, private to the docker network.
- Caddy fronts TLS on `:443`, proxies only `/health`, `/scan`, `/scan/validate`.
- `X-Scanner-Token` auth on inbound; `X-Hetzner-Webhook-Secret` on outbound.
- Jobs are queued in-process; concurrency via `MAX_CONCURRENT_SCANS`.
- Private / loopback / link-local targets are blocked unless
  `ALLOW_PRIVATE_TARGETS=true` (dev only).

## Directory layout

```
scanner-server/
  app/
    main.py            FastAPI app + /scan + /health
    auth.py            X-Scanner-Token check
    config.py          pydantic-settings (reads .env)
    queue.py           asyncio worker pool
    callback.py        webhook POST w/ retry
    storage.py         GCS upload + v4 signed URLs
    validation.py      target hardening (no RFC1918, etc.)
    scanners/
      base.py, nmap.py, nuclei.py, zap.py
  Dockerfile
  docker-compose.yml   scanner + zap + caddy
  deploy/
    caddy/Caddyfile
    systemd/vulnscanners-scanner.service
    install.sh         one-shot VPS bootstrap
  .env.example
```

## Deploy on a fresh Hetzner VPS

1. DNS: point `scanner.vulnscanners.com` (or whatever hostname) at the VPS IP.
2. SSH in as root.
3. Bootstrap:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/zackelmet/vulnscanners/main/scanner-server/deploy/install.sh \
     | REPO_URL=https://github.com/zackelmet/vulnscanners.git BRANCH=main bash
   ```
   (First run clones the repo to `/opt/vulnscanners-scanner`, copies `.env.example`
   to `.env`, and exits asking you to fill it in.)
4. Edit `/opt/vulnscanners-scanner/scanner-server/.env` and set:
   - `SCANNER_HOSTNAME` (must match DNS)
   - `HETZNER_SCANNER_AUTH_TOKEN`  (`openssl rand -hex 32`)
   - `HETZNER_WEBHOOK_SECRET`      (`openssl rand -hex 32`)
   - `ZAP_API_KEY`                 (`openssl rand -hex 16`)
5. Upload the GCP service account JSON:
   ```bash
   scp gcp-key.json root@<vps>:/opt/vulnscanners-scanner/scanner-server/gcp-key.json
   ```
6. Re-run the installer; it will build and start the stack under systemd.

### Vercel env vars to mirror

| Key | Value |
| --- | --- |
| `HETZNER_SCANNER_URL` | `https://scanner.vulnscanners.com` |
| `HETZNER_SCANNER_AUTH_TOKEN` | same as on the VPS |
| `HETZNER_WEBHOOK_SECRET` | same as on the VPS |
| `VERCEL_WEBHOOK_URL` | `https://vulnscanners.com/api/scans/webhook` |

### GCP service account

Create in IAM → Service Accounts, download JSON key, grant:
- `roles/storage.objectAdmin` on bucket `hosted-scanners-reports`
- `roles/iam.serviceAccountTokenCreator` on itself (required for v4 signed URLs)

## Local development

```bash
cd scanner-server
cp .env.example .env      # fill in test values
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

Run the tests:
```bash
pytest -q
```

## Smoke test

```bash
# Health
curl https://scanner.vulnscanners.com/health

# Dispatch (replace TOKEN)
curl -X POST https://scanner.vulnscanners.com/scan \
  -H "Content-Type: application/json" \
  -H "X-Scanner-Token: $HETZNER_SCANNER_AUTH_TOKEN" \
  -d '{
    "scanId": "test-123",
    "scanner": "nmap",
    "target": "scanme.nmap.org",
    "options": {"scanProfile": "quick"},
    "userId": "local-dev"
  }'
```

Look for webhook delivery in `docker compose logs scanner`.

## Security notes

- Scan only assets you own or are explicitly authorized to test.
- Target validation resolves the hostname and rejects private / loopback /
  link-local / reserved addresses before any scanner is spawned.
- Scanner workdirs live in `tempfile.mkdtemp()` and are removed after the run.
- The container runs as the unprivileged `scanner` user; `NET_RAW` /
  `NET_ADMIN` are granted only so nmap can use its normal probe modes.
