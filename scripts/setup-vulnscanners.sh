#!/usr/bin/env bash
# Setup helper for VulnScanners (interactive). Run locally after authenticating CLIs.
# This script is a guide and will prompt you for values; do NOT store secrets in git.

set -euo pipefail

echo "=== VulnScanners Setup Helper ==="

echo "1) Vercel: create and link a project"
echo "   If you are not logged in, run: vercel login"
echo "   Interactive create:"
echo "     vercel --prod --confirm --name vulnscanners"
echo "   Or non-interactive (using VERCEL_TOKEN):"
echo "     VERCEL_TOKEN=your_token vercel projects create vulnscanners --scope YOUR_SCOPE --framework nextjs"

echo
echo "2) Vercel: add production environment variables (recommended: use Vercel dashboard)"
echo "   Example (interactive):"
echo "     vercel env add STRIPE_SECRET_KEY production"
echo "     vercel env add STRIPE_WEBHOOK_SECRET production"
echo "     vercel env add FIREBASE_ADMIN_CLIENT_EMAIL production"
echo "     vercel env add FIREBASE_ADMIN_PRIVATE_KEY production"
echo "     vercel env add FIREBASE_ADMIN_PROJECT_ID production"
echo "     vercel env add NEXT_PUBLIC_BASE_URL production"

echo
echo "3) Firebase: create a new project named 'vulnscanners' (or vulnscanners-<suffix> if id taken)"
echo "   Authenticate: firebase login"
echo "   Create (example):"
echo "     firebase projects:create vulnscanners-12345 --display-name \"VulnScanners\""
echo "   After creation, link the local repo:
echo "     firebase use --add vulnscanners-12345"

echo
echo "4) Firebase: create and download a service account JSON from the GCP Console"
echo "   - Create service account 'vulnscanners-admin' with Firestore/Storage permissions"
echo "   - Download JSON key and keep it secret. Use values to set Vercel envs listed above."

echo
echo "5) Stripe: login and set webhook"
echo "   - Login: stripe login"
echo "   - Option A (use Stripe Dashboard): create webhook to https://vulnscanners.com/api/stripe/webhook and copy the signing secret into Vercel as STRIPE_WEBHOOK_SECRET"
echo "   - Option B (locally test with Stripe CLI): stripe listen --forward-to localhost:3000/api/stripe/webhook"

echo
echo "6) Provision Stripe prices (optional):"
echo "   - Use existing script: node ./scripts/provision-stripe-vulnscanners.mjs"
echo "     (ensure STRIPE_SECRET_KEY is set in your environment or .env.production)"

echo
echo "7) Deploy to Vercel once env vars are set:"
echo "   vercel --prod"

echo
echo "NOTE: This script is a helper with recommended commands. It cannot run fully unattended here — run the relevant commands interactively after authenticating your CLIs."

exit 0
