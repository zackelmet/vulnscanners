# Hetzner Migration Notes

## Current Direction
- Frontend/API remains on Vercel (`vulnscanners` project).
- Scanner execution moves to Hetzner-managed worker service.

## Runtime Targets
- Scanner worker API path: `/scan`
- Shared auth header: `X-Scanner-Token`
- Shared auth secret source: `HETZNER_SCANNER_AUTH_TOKEN`

## Network & TLS
- Expose scanner service behind reverse proxy (Caddy recommended).
- Keep app process private on internal port (e.g. `8080`).
- Public scanner API domain should terminate HTTPS at proxy.

## Required Env (Worker + Web App)
- `HETZNER_SCANNER_URL`
- `HETZNER_SCANNER_AUTH_TOKEN`
- `HETZNER_WEBHOOK_SECRET`
- `VERCEL_WEBHOOK_URL`
- `FIREBASE_ADMIN_PROJECT_ID`
- `FIREBASE_ADMIN_CLIENT_EMAIL`
- `FIREBASE_ADMIN_PRIVATE_KEY`

## Operational Defaults
- Enforce strict target validation.
- Block private/internal ranges at worker level.
- Keep permissive payload parsing for extra fields, strict for required fields.
