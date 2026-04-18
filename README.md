# VulnScanners — Hosted Security Scanners

SaaS platform for cloud-hosted vulnerability scanners (e.g., Nmap, Nuclei) with a Next.js frontend and serverless backend.

Note: The repository contains a legacy `Landing page/` directory. We are deprecating that directory and will not use it going forward; the main product is the `SaaS/` app (now branded `VulnScanners`).

## Quick Start (local)

1) Install deps: `npm install`
2) Copy `.env.example` to `.env.local` and fill Firebase/Stripe creds. For production, set variables in Vercel for `vulnscanners.com`.
3) Run dev server: `npm run dev` → http://localhost:3000

## Deploying
- Frontend: Vercel (Next.js 14)
- Backend: Hetzner VPS (`api.vulnscanners.com`) running the FastAPI/Celery scan worker. The Vercel app dispatches jobs via `POST https://api.vulnscanners.com/scan` and receives completion callbacks via the webhook endpoint below.
- Storage: GCS bucket for scan results

---

## Webhook Contract

The Hetzner worker POSTs scan results to:

```
POST https://vulnscanners.com/api/scans/webhook
```

### Required headers

| Header | Value |
|---|---|
| `x-webhook-signature` **or** `x-gcp-webhook-secret` **or** `x-webhook-secret` | Value of `GCP_WEBHOOK_SECRET` env var |

Any one of the three header names is accepted so workers with different naming
conventions both work.

### Request body (JSON)

All fields below are **required** unless marked optional.

| Field | Type | Notes |
|---|---|---|
| `scanId` | `string` | Firestore scan document ID |
| `userId` | `string` | Firebase UID of the scan owner |
| `scanType` | `"nmap" \| "nuclei" \| "zap"` | Scanner that ran the job |
| `status` | `"queued" \| "running" \| "completed" \| "failed" \| "canceled" \| "timeout"` | Terminal status after worker finishes |
| `startedAt` | ISO 8601 string **or** epoch ms (number) | When the scanner started |
| `completedAt` | ISO 8601 string **or** epoch ms (number) | When the scanner finished |
| `durationSec` | `number` (≥ 0) | Wall-clock duration in seconds |
| `resultUrl` **or** `resultPath` | `string` | At least one must be present. `resultUrl` is a full URL; `resultPath` is a GCS object path. |
| `error` | `string` | **Required when `status` is `"failed"`** |
| `eventId` | `string` (optional) | Idempotency key. If omitted, a deterministic SHA-256 hash of the stable payload fields is used. |
| `summary` | `object` (optional) | Scan summary (critical/high/medium/low/info counts). |
| *(any additional fields)* | — | Stored verbatim in `scans/{scanId}.rawPayload` for forward compatibility. |

#### Idempotency

The webhook writes `scans/{scanId}/events/{eventId}` **with create semantics** before
processing. If the document already exists the request returns `200` immediately
without reprocessing, so duplicate deliveries are safe.

### Firestore writes

On a successful call the webhook updates two documents (merge):

1. `scans/{scanId}` — canonical scan fields + `rawPayload`
2. `users/{userId}/completedScans/{scanId}` — mirror of the same data

### Example request

```bash
curl -X POST https://vulnscanners.com/api/scans/webhook \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: $GCP_WEBHOOK_SECRET" \
  -d '{
    "scanId": "abc123",
    "userId": "uid_xyz",
    "scanType": "nmap",
    "status": "completed",
    "startedAt": "2025-06-01T10:00:00Z",
    "completedAt": "2025-06-01T10:05:00Z",
    "durationSec": 300,
    "resultUrl": "https://storage.googleapis.com/bucket/abc123.json",
    "eventId": "evt_abc123_1"
  }'
```

---

## Dispatch (Vercel → Hetzner worker)

The Vercel backend dispatches scan jobs by calling:

```
POST https://api.vulnscanners.com/scan
Header: X-Scanner-Token: <GCP_WEBHOOK_SECRET>
```

The **same secret** (`GCP_WEBHOOK_SECRET`) is used for dispatch authentication
(`X-Scanner-Token`) and for webhook callback authentication.  It is a
server-only secret — never use a `NEXT_PUBLIC_` prefix for it.

---

## Secret management (`GCP_WEBHOOK_SECRET`)

### Generate a secret locally

```bash
openssl rand -hex 32
```

### Set in Vercel (Production only)

```bash
# Add to production environment only
vercel env add GCP_WEBHOOK_SECRET production
# Paste the generated secret when prompted

# Verify it was stored
vercel env ls production
```

The secret must also be set on the Hetzner worker side (in its `.env` /
`EnvironmentFile`) so it can authenticate calls from Vercel and include the
correct secret in webhook callbacks.

---

## One More Thing
This project is for authorized security testing only. Ensure you have permission before scanning any target.

Last updated: April 2026
