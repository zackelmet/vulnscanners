# API Contract

## Dispatch (Web App -> Scanner Worker)
- Method: `POST`
- URL: `${HETZNER_SCANNER_URL}/scan`
- Headers:
  - `Content-Type: application/json`
  - `X-Scanner-Token: ${HETZNER_SCANNER_AUTH_TOKEN}`
- Body:
  - `scanId` (string)
  - `scanner` (`nmap | nuclei | zap`)
  - `target` (string)
  - `options` (object)
  - `userId` (string)

## Callback (Scanner Worker -> Web App)
- Method: `POST`
- URL: `/api/scans/webhook`
- Accepted auth headers (any one):
  - `x-webhook-signature`
  - `x-gcp-webhook-secret`
  - `x-hetzner-webhook-secret`
  - `x-webhook-secret`
- Secret value: `${HETZNER_WEBHOOK_SECRET}`

## Canonical Payload (Callback)
Required fields to enforce:
- `scanId` (string)
- `userId` (string)
- `scannerType` (`nmap | nuclei | zap`)
- `status` (`queued | in_progress | completed | failed | cancelled`)
- `gcpStorageUrl` or `gcsPath` (string, at least one)

Recommended fields:
- `resultsSummary` (object)
- `billingUnits` (number)
- `errorMessage` (string when failed)
- `gcpSignedUrl`, `gcpSignedUrlExpires`
- `gcpXmlStorageUrl`, `gcpXmlSignedUrl`, `gcpXmlSignedUrlExpires`
- `gcpReportStorageUrl`, `gcpReportSignedUrl`, `gcpReportSignedUrlExpires`

## Firestore Writes
- Global: `scans/{scanId}`
- Per user mirror: `users/{userId}/completedScans/{scanId}`
