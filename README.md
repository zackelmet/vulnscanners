# VulnScanners

VulnScanners is a SaaS vulnerability scanning platform with:
- Next.js web app + API routes
- Firebase Auth + Firestore
- Stripe credit billing
- Scanner backend migration to Hetzner (in progress)

## Local Dev
1. `npm install`
2. Create `/.env.local` (gitignored) with required Firebase/Stripe vars
3. `npm run dev`

## Production
- Web app: Vercel project `vulnscanners`
- Domain: `vulnscanners.vercel.app` / `vulnscanners.com`
- Firestore project: `vulnscanners`

## Backend Contract
- Dispatch: scanner jobs sent to `${HETZNER_SCANNER_URL}/scan` with `X-Scanner-Token`
- Callback webhook: `POST /api/scans/webhook`
- Canonical payload + required fields: see `docs/API_CONTRACT.md`

## Hetzner Migration
Use `docs/HETZNER.md` as the source of truth for runtime/deploy decisions.

## Security Notice
Run scans only against assets you own or are explicitly authorized to test.
