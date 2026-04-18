# VulnScanners

VulnScanners is a SaaS vulnerability scanning platform with:
- Next.js web app + API routes
- Firebase Auth + Firestore
- Stripe credit billing
- Scanner backend on Hetzner

## Local Dev
1. `npm install`
2. Create `/.env.local` (gitignored) with required Firebase/Stripe vars
3. `npm run dev`

## Production
- Web app: Vercel project `vulnscanners`
- Domain: `vulnscanners.vercel.app` / `vulnscanners.com`
- Firestore project: `vulnscanners`
- Scanner worker: `https://api.vulnscanners.com`

## Webhook Endpoint

**`POST /api/scans/webhook`**

Receives scan lifecycle callbacks from the Hetzner scanner worker.

### Auth
Include **one** of these headers with the value of `GCP_WEBHOOK_SECRET`:
```
x-webhook-signature: <secret>
x-gcp-webhook-secret: <secret>
x-webhook-secret: <secret>
```

### Required payload fields
| Field | Type |
|---|---|
| `eventId` | string — unique per event (idempotency key) |
| `scanId` | string |
| `userId` | string |
| `scanType` | `nmap \| nuclei \| zap` |
| `status` | `queued \| running \| completed \| failed \| canceled \| timeout` |
| `startedAt` | ISO 8601 string or ms epoch |
| `completedAt` | ISO 8601 string or ms epoch |
| `durationSec` | number |
| `resultUrl` **or** `resultPath` | string (at least one) |

`error` (string) is required when `status` is `"failed"`.

Unknown extra fields are accepted and stored in `scans/{scanId}.rawPayload`
(not mirrored to the user subcollection).

### Idempotency
The webhook writes `scans/{scanId}/events/{eventId}` on first delivery using
Firestore create-only semantics. Duplicate deliveries of the same `eventId`
return `200 OK` immediately without re-processing.

---

## Dispatch Endpoint

**`POST /api/scans/dispatch`**

Server-side route to forward a scan job to the Hetzner worker.
Requires a valid Firebase ID token.

```json
{
  "scanId": "<id>",
  "scanType": "nmap",
  "target": "example.com",
  "options": {}
}
```

The route calls `POST ${GCP_SCANNER_URL}/scan` with
`X-Scanner-Token: ${GCP_WEBHOOK_SECRET}`.

> The **same** `GCP_WEBHOOK_SECRET` is used for dispatch (`X-Scanner-Token`)
> and for webhook callback auth.

---

## Environment Variables

See `.env.production.example` for the full list.
Key secrets:

| Variable | Purpose |
|---|---|
| `GCP_WEBHOOK_SECRET` | Shared secret for dispatch + webhook auth |
| `GCP_SCANNER_URL` | Base URL of Hetzner scanner worker |
| `VERCEL_WEBHOOK_URL` | Webhook callback URL passed to worker |

### Setting `GCP_WEBHOOK_SECRET` on Vercel (Production only)

```bash
# Add the secret scoped to production only
vercel env add GCP_WEBHOOK_SECRET production

# Verify it was saved
vercel env ls

# Re-deploy to pick up the new value
vercel --prod
```

---

## Backend Contract
Full payload schema, idempotency details, and Firestore write targets:
see `docs/API_CONTRACT.md`

## Hetzner Notes
Runtime and deployment decisions: see `docs/HETZNER.md`

## Security Notice
Run scans only against assets you own or are explicitly authorized to test.
