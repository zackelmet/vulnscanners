# VulnScanners worker

The scanner-execution backend that runs Nmap, Nuclei, and OWASP ZAP scans on
behalf of the Vercel app. Deployed to a single Hetzner VM behind Caddy at
`https://api.vulnscanners.com`.

This directory is **excluded from the Vercel deployment** via the repo's
`.vercelignore` — it lives here for version control and review only.

## How requests flow

```
  Vercel Next.js                    Hetzner worker                  scanme.nmap.org
  ─────────────                     ──────────────                  ───────────────
  POST /scan ──────► /api/scans
                     enqueueScanJob
                     │
                     ▼
                 HTTPS POST /scan ─────────────────► Flask /scan
                 X-Scanner-Token                     queue.put(job)
                                                     │
                                                     ▼
                                                 worker_loop thread
                                                     subprocess.run(["nmap", …])  ───► target
                                                     │
                                                     ▼
                                                 POST /api/scans/webhook ◄──── results
  ◄─────── webhook
  upload to Storage,
  Firestore update
```

- **App → worker**: `POST /scan` with shared-secret header `X-Scanner-Token`,
  body `{scanId, userId, scanner, target, options}`.
- **Worker → app**: `POST` to `VERCEL_WEBHOOK_URL` with the raw stdout/xml,
  returncode, duration, and a `resultsSummary`. The callback **retries** on
  5xx / network errors (backoff `0/2/5/15/30s`) so a completed scan's result
  isn't lost to a transient blip. Each delivery carries a unique `eventId`;
  the receiver dedupes on it, so retries never double-count or double-email.
  If every retry fails, the app-side stuck-scan reaper is the final backstop
  (see below).
- Auth is a symmetric shared secret (`GCP_WEBHOOK_SECRET` on the worker side,
  `HETZNER_WEBHOOK_SECRET` / `HETZNER_SCANNER_AUTH_TOKEN` on the Vercel side
  — same value).

### Reliability backstops

- A scan reserves one credit at creation. If it never reports back (worker
  reboot drops the in-memory queue, callback exhausts its retries, etc.) the
  app's **stuck-scan reaper** (`/api/cron/reap-stuck-scans`) marks it failed
  and refunds the credit. The reaper runs daily on Vercel and hourly from this
  box's crontab (see "Cron on the box"). Tunable via `SCAN_STUCK_MINUTES`
  (app env, default 60).
- ZAP runs in a Docker container. On a scan timeout the worker force-removes
  the named container (`docker rm -f`) so a killed `docker run` client can't
  leave it running and leaking CPU/RAM on the box.

## Layout on the Hetzner box

| Path | Purpose |
| --- | --- |
| `/opt/vulnscanners/backend/app.py` | This worker, deployed by `deploy.sh` |
| `/opt/vulnscanners/backend/.venv/` | Python venv (Flask + requests) |
| `/opt/vulnscanners/backend/requirements.txt` | Mirrors this dir's file |
| `/opt/vulnscanners/output/` | Per-scan stdout/stderr/xml files (rotated separately) |
| `/opt/vulnscanners/logs/scanner.{out,err}.log` | systemd-captured worker logs |
| `/etc/vulnscanners/backend.env` | Secrets — root-only, NOT in git |
| `/etc/systemd/system/vulnscanners-scanner.service` | systemd unit (mirror in `systemd/`) |

## Deployment

```bash
# From this directory, on a machine that has the SSH key:
./deploy.sh
```

The script syntax-checks the local `app.py`, scp's it + `requirements.txt` up,
reinstalls deps (idempotent), restarts the systemd unit, and verifies
`/health` is 200. No CI hook — invoke manually after merging changes.

Override the host / user / key with env vars (see the head of `deploy.sh`).

> Restarting the systemd unit drops the in-memory job queue. `deploy.sh`
> doesn't check for in-flight scans — confirm `curl -s localhost:8080/health`
> shows `queue_size: 0` before deploying, or accept that any running scans will
> be reaped + credit-refunded by the app instead of completing.

## Cron on the box

Vercel Hobby only runs crons once daily, so the box's root crontab triggers the
app's cron endpoints hourly as the primary schedule (Vercel's daily runs are a
backup). Each entry sends `Authorization: Bearer $CRON_SECRET`:

```cron
0 * * * * curl -fsS -L -H "Authorization: Bearer $CRON_SECRET" https://vulnscanners.com/api/cron/scheduled-scans  >/dev/null 2>&1
5 * * * * curl -fsS -L -H "Authorization: Bearer $CRON_SECRET" https://vulnscanners.com/api/cron/reap-stuck-scans >/dev/null 2>&1
```

(The literal secret lives in the crontab on the box and in Vercel's
`CRON_SECRET` env — same value. Edit with `crontab -e` as root.)

## Reading logs

```bash
ssh -i ~/.ssh/vulnscanners_hetzner_ed25519 root@178.104.172.54 \
  'tail -f /opt/vulnscanners/logs/scanner.out.log'
```

Per-scan log lines look like:

```
[worker=1] START scan_id=… scanner=nmap target='scanme.nmap.org' options={'topPorts': 1000}
[worker=1] END   scan_id=… scanner=nmap rc=0 duration=18s stdout_bytes=2740 stderr_bytes=0 xml_bytes=8104
[worker=1] WARN  scan_id=… completed with empty stdout; stderr_tail=''   ← only when stdout is empty
[worker=1] FAIL  scan_id=… scanner=nuclei duration=1800s exception=TimeoutExpired: …
```

## Configuration

Environment variables read by `app.py`:

| Var | Default | Purpose |
| --- | --- | --- |
| `GCP_WEBHOOK_SECRET` | (required) | Shared secret with the Vercel side |
| `VERCEL_WEBHOOK_URL` | (required) | Where to POST results back to |
| `SCAN_WORKERS` | `2` | Concurrent worker threads (each handles one scan at a time) |
| `SCAN_TIMEOUT_SECONDS` | `1800` | Kill-switch per scan |
| `SCAN_OUTPUT_DIR` | `/opt/vulnscanners/output` | Where per-scan files are persisted |

See `.env.example` for placeholder values.

## Local dev

Not really set up for it — the worker mostly orchestrates `nmap` / `nuclei` /
`docker run zaproxy/zap-stable`, all of which need to actually be installed
and able to reach the public internet. If you really want to iterate on
parsing or payload shape locally:

```bash
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
GCP_WEBHOOK_SECRET=test VERCEL_WEBHOOK_URL=http://localhost:3000/api/scans/webhook \
  .venv/bin/python app.py
```

Then `curl -X POST -H 'X-Scanner-Token: test' …` against `127.0.0.1:8080`.
