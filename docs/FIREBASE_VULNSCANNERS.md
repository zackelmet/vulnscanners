# Firebase setup for VulnScanners

This short guide shows the minimal steps to create a new Firebase project named `vulnscanners` and the environment variables your app needs. Keep production secrets in Vercel (or another secret manager) — do NOT commit them to git.

## High-level steps

1. Install Firebase CLI (if not already):

```bash
npm install -g firebase-tools
```

2. Create a new Firebase project in your account (console or CLI):

```bash
# interactive: pick a project ID like "vulnscanners-<suffix>" or use an explicit id
firebase projects:create vulnscanners-12345 --display-name "VulnScanners"
```

3. Enable services used by the app in the Firebase console:
- Authentication (Email/Password + Google provider)
- Firestore (Native mode)
- Cloud Storage
- (Optional) Cloud Functions / Cloud Run if you use serverless backends

4. Create a service account for server-side Firebase Admin access and download the JSON key.

From the Google Cloud Console (IAM & Admin > Service Accounts):
- Create service account `vulnscanners-admin` with the role `Owner` or the specific roles your backend needs (Firestore Admin, Storage Admin, Cloud Tasks Enqueuer, etc.).
- Create and download a JSON key.

5. Add required environment variables to Vercel (production) and to local `.env.local` for development (sanitized):

Required server-side env vars (Vercel - mark as secret):
- `FIREBASE_ADMIN_CLIENT_EMAIL` -> service account client_email
- `FIREBASE_ADMIN_PRIVATE_KEY` -> service account private_key (newlines preserved)
- `FIREBASE_ADMIN_PROJECT_ID` -> your Firebase project id (e.g. `vulnscanners-12345`)
- `GCP_BUCKET_NAME` -> (Cloud Storage bucket name) e.g. `vulnscanners-reports`
- `GCP_WEBHOOK_SECRET` -> shared secret used to validate webhooks
- `STRIPE_SECRET_KEY` -> sk_live_xxx
- `STRIPE_WEBHOOK_SECRET` -> Stripe webhook signing secret

Required client-side envs (non-secret, set on Vercel as well):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_BASE_URL` (set to your production domain, e.g. `https://vulnscanners.com`)

6. Initialize local project for the new Firebase project (optional):

```bash
# to link this local repo to the new project
firebase use --add vulnscanners-12345
# select default project alias and save in .firebaserc
```

7. Deploy the frontend to Vercel and confirm environment variables are set in the Vercel Dashboard.

## Webhook and Stripe testing
- Create a webhook endpoint on the deployed app: `https://vulnscanners.com/api/stripe/webhook` (or `api/scans/webhook` depending on your routes). Use the Stripe Dashboard to add this endpoint and copy the `STRIPE_WEBHOOK_SECRET` to Vercel secrets.
- Use `stripe listen` locally to forward events to a local server for end-to-end testing, or use Dashboard test events to the deployed endpoint.

## Notes on migration
- The new Firebase project will be empty. You mentioned migrating users later — plan an export from the old project and an import flow (or use Firebase Auth bulk export/import). Keep users' UIDs stable if you migrate data by mapping old project UIDs to new ones.

## Helpful commands

- Create Firestore indexes (if you have indexes file):
  ```bash
  firebase deploy --only firestore:indexes
  ```

- Deploy functions (if used):
  ```bash
  firebase deploy --only functions
  ```

If you want, I can: create a checklist to run through the Firebase console steps, generate a minimal service-account JSON template (without secrets) to place in repo docs, or prepare a migration plan for users. Let me know which you'd like next.
