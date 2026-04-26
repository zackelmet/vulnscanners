# vulnscanners backend (Hetzner worker)

FastAPI service that runs the actual `nmap`, `nuclei`, and `zap` scans on a
Hetzner VPS. The Vercel-hosted Next.js app dispatches jobs here over HTTPS and
receives results via webhook callback.

## Contract

See `docs/API_CONTRACT.md` at the repo root. In short:

- **Inbound:** `POST /scan` with header `X-Scanner-Token: ${HETZNER_SCANNER_AUTH_TOKEN}`
  and JSON body `{ scanId, scanner, target, options, userId }`.
- **Outbound:** `POST ${VERCEL_WEBHOOK_URL}` with header
  `x-hetzner-webhook-secret: ${HETZNER_WEBHOOK_SECRET}` and the canonical
  payload (`scanId`, `userId`, `scannerType`, `status`,
  `gcpStorageUrl`/`gcpSignedUrl`, `resultsSummary`, `billingUnits`,
  `errorMessage` on failure).

## Layout

```
backend/
├── app/
│   ├── main.py          # FastAPI app + /scan route
│   ├── config.py        # env-driven Settings
│   ├── auth.py          # X-Scanner-Token validation
│   ├── validation.py    # target normalization + private-range blocking
│   ├── queue.py         # in-process FIFO + N async workers
│   ├── storage.py       # GCS upload + v4 signed URL generation
│   ├── webhook.py       # callback to the Vercel app (with retry/backoff)
│   └── scanners/
│       ├── nmap.py
│       ├── nuclei.py
│       └── zap.py
├── deploy/
│   ├── install.sh                         # one-shot Hetzner provisioner
│   ├── vulnscanners-backend.service       # systemd unit
│   └── Caddyfile                          # reverse proxy + TLS
├── tests/
├── .env.example
├── requirements.txt
└── README.md
```

## Required env

Copy `.env.example` to `/etc/vulnscanners/backend.env` and fill in:

| var | what |
| --- | --- |
| `HETZNER_SCANNER_AUTH_TOKEN` | shared secret for inbound `/scan` requests |
| `HETZNER_WEBHOOK_SECRET`     | shared secret for outbound webhook callbacks |
| `VERCEL_WEBHOOK_URL`         | e.g. `https://vulnscanners.com/api/scans/webhook` |
| `GCP_PROJECT_ID`             | hosted-scanners |
| `GCP_BUCKET_NAME`            | hosted-scanners-reports |
| `GCP_SERVICE_ACCOUNT_KEY`    | base64-encoded service-account JSON (must allow object read/write + signedURL) |

Optional:

| var | default | what |
| --- | --- | --- |
| `BACKEND_HOST` | `127.0.0.1` | bind address (Caddy proxies in front) |
| `BACKEND_PORT` | `8080`      | bind port |
| `SCAN_CONCURRENCY` | `2`     | how many scans run in parallel |
| `SCAN_TIMEOUT_SECONDS` | `1800` | hard wall-clock limit per scan |
| `BLOCK_PRIVATE_TARGETS` | `true` | refuse to scan RFC1918/loopback/link-local |
| `ZAP_API_URL` | _empty_ | if set, drive ZAP via its REST API instead of `zap-baseline.py` |
| `ZAP_API_KEY` | _empty_ | matching API key |
| `NUCLEI_TEMPLATES_DIR` | _empty_ | override bundled nuclei templates |
| `LOG_LEVEL` | `INFO` | |

## Local development

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# edit .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8080
```

Smoke test:

```bash
curl -fsS http://127.0.0.1:8080/health
curl -fsS -X POST http://127.0.0.1:8080/scan \
    -H "Content-Type: application/json" \
    -H "X-Scanner-Token: $HETZNER_SCANNER_AUTH_TOKEN" \
    -d '{
          "scanId": "demo-1",
          "scanner": "nmap",
          "target": "scanme.nmap.org",
          "options": {"scanProfile": "quick"},
          "userId": "demo-user"
        }'
```

## Production deploy on Hetzner

On a fresh Debian 12 / Ubuntu 22.04 box:

```bash
sudo bash backend/deploy/install.sh
sudo $EDITOR /etc/vulnscanners/backend.env
sudo systemctl restart vulnscanners-backend
sudo SCANNER_PUBLIC_HOSTNAME=scanner.vulnscanners.com systemctl reload caddy
```

The installer:

1. Installs `nmap`, `nuclei`, Caddy, Python.
2. Clones the repo into `/opt/vulnscanners`.
3. Builds a venv and installs `requirements.txt`.
4. Drops the systemd unit and Caddy site.
5. Starts the worker bound to `127.0.0.1:8080`; Caddy terminates TLS.

## Operational notes

- **No client secrets ever leave the worker.** The service account key,
  scanner token, and webhook secret are read from `/etc/vulnscanners/backend.env`
  (mode `0640`, owned `root:vulnscanners`).
- **Target safety.** Every target passes through `app/validation.py`, which
  resolves DNS and refuses any address inside RFC1918, loopback, link-local,
  multicast, reserved, or unspecified ranges (toggle with
  `BLOCK_PRIVATE_TARGETS=false` if you really need internal scanning).
- **Subprocess safety.** All scanner CLIs are invoked with `argv` arrays
  (never a shell string), and option whitelists reject anything outside the
  documented surface (`scanProfile`, `timing`, `ports`, `severity`,
  `templates`, etc.). `customFlags` for nmap is tokenised with `shlex` and
  flags must start with `-`.
- **Timeouts.** Hard kill at `SCAN_TIMEOUT_SECONDS`. Failures still produce a
  `failed` webhook so the web app can release the credit.
- **Retries.** Webhook posts retry up to 4 times with exponential backoff;
  permanent 4xx (other than 429) are not retried.

## Security posture

This service runs unauthenticated network scans against arbitrary internet
targets on behalf of paying customers. It MUST be deployed:

- behind Caddy with valid TLS,
- with a strong random `HETZNER_SCANNER_AUTH_TOKEN`,
- with `BLOCK_PRIVATE_TARGETS=true` (default),
- with rate limiting upstream (Vercel route) and credit gating
  (already enforced by `src/app/api/scans/route.ts`).
