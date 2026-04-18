# API Contract

## Dispatch (Web App -> Scanner Worker)

### Via API route (recommended)
- Method: `POST`
- URL: `/api/scans/dispatch`
- Auth: `Authorization: Bearer <Firebase ID token>`
- Body:
  - `scanId` (string, required)
  - `scanType` (`nmap | nuclei | zap`, required)
  - `target` (string, required)
  - `options` (object, optional)

### Direct worker call (internal)
- Method: `POST`
- URL: `${GCP_SCANNER_URL}/scan`  (e.g. `https://api.vulnscanners.com/scan`)
- Headers:
  - `Content-Type: application/json`
  - `X-Scanner-Token: ${GCP_WEBHOOK_SECRET}`
- Body:
  - `scanId` (string)
  - `scanType` (`nmap | nuclei | zap`)
  - `target` (string)
  - `options` (object)
  - `userId` (string)

> **Note:** `X-Scanner-Token` and the webhook auth headers all use the same
> `GCP_WEBHOOK_SECRET` value.

---

## Callback Webhook (Scanner Worker -> Web App)

- Method: `POST`
- URL: `/api/scans/webhook`
- Auth (accept any one header):
  - `x-webhook-signature: ${GCP_WEBHOOK_SECRET}`
  - `x-gcp-webhook-secret: ${GCP_WEBHOOK_SECRET}`
  - `x-webhook-secret: ${GCP_WEBHOOK_SECRET}`

### Required fields
| Field | Type | Notes |
|---|---|---|
| `eventId` | string | Unique per event; used for idempotency |
| `scanId` | string | Firestore document ID under `scans/` |
| `userId` | string | Owner's Firebase UID |
| `scanType` | `nmap \| nuclei \| zap` | |
| `status` | `queued \| running \| completed \| failed \| canceled \| timeout` | |
| `startedAt` | ISO string or ms epoch | Converted to Firestore Timestamp |
| `completedAt` | ISO string or ms epoch | Converted to Firestore Timestamp |
| `durationSec` | number | Scan wall-clock duration |
| `resultUrl` **or** `resultPath` | string | At least one must be present |

### Conditional fields
| Field | Type | Condition |
|---|---|---|
| `error` | string | **Required** when `status == "failed"` |

### Optional fields
| Field | Type | Notes |
|---|---|---|
| `summary` | object | e.g. `{ critical, high, medium, low, info, total }` |
| `billingUnits` | number | Used to reconcile usage counters |

### Extra / unknown fields
Any additional fields are accepted and stored verbatim in
`scans/{scanId}.rawPayload`. They are **not** mirrored to the user subcollection.

---

## Idempotency

1. On each webhook call the handler attempts to **create**
   `scans/{scanId}/events/{eventId}` (Firestore create-only semantics).
2. If that document already exists the handler returns `200 OK` immediately
   and skips all further processing.
3. This makes every `(scanId, eventId)` pair safe to deliver more than once.

---

## Firestore Writes

| Collection | Fields written |
|---|---|
| `scans/{scanId}` | All validated fields + `rawPayload` |
| `scans/{scanId}/events/{eventId}` | `eventId`, `status`, `receivedAt` |
| `users/{userId}/completedScans/{scanId}` | All validated fields **except** `rawPayload` |

