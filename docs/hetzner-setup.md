# Hetzner VPS – Scanner Worker Provisioning Guide

> **Scope:** This guide sets up a fresh **Ubuntu 24.04** Hetzner VPS as the
> VulnScanners scanner-worker backend (`api.vulnscanners.com`).  
> All commands are run **on the VPS** via SSH (or paste into a cloud-init
> script), **not** from a local machine.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [First Login & Bootstrap](#2-first-login--bootstrap)
3. [Install Dependencies](#3-install-dependencies)
4. [Deploy Worker Code](#4-deploy-worker-code)
5. [Configure Secrets](#5-configure-secrets)
6. [Start & Verify Services](#6-start--verify-services)
7. [Logging & Log Retention](#7-logging--log-retention)
8. [Updating the Worker](#8-updating-the-worker)
9. [Vercel Environment Variables](#9-vercel-environment-variables)
10. [Secret Generation Reference](#10-secret-generation-reference)
11. [Security Checklist](#11-security-checklist)

---

## 1. Prerequisites

| Item | Value |
|------|-------|
| VPS OS | Ubuntu 24.04 LTS (Hetzner Cloud — CX21 or larger) |
| Public IP | `<your-vps-ip>` |
| Domain | `api.vulnscanners.com` |
| DNS | A record `api.vulnscanners.com` → `<your-vps-ip>` (propagate before step 6) |
| SSH key | A dedicated keypair — **never reuse personal keys for server access** |

> ⚠️ **Before you start:** ensure you have an SSH key installed on the VPS.
> If you exposed a private key anywhere (e.g., chat, issue tracker), revoke it
> immediately and generate a fresh keypair:
> ```bash
> ssh-keygen -t ed25519 -C "vulnscanners-deploy" -f ~/.ssh/vulnscanners_deploy
> # Add ~/.ssh/vulnscanners_deploy.pub to Hetzner → Project → SSH Keys
> ```

---

## 2. First Login & Bootstrap

```bash
# From your local machine
ssh -i ~/.ssh/vulnscanners_deploy root@<your-vps-ip>
```

Once on the VPS, run the bootstrap script (OS hardening + UFW firewall):

```bash
# Clone the repo onto the server (read-only HTTPS, no deploy key needed for public repo)
git clone https://github.com/zackelmet/vulnscanners.git /opt/setup
cd /opt/setup

chmod +x ops/bootstrap.sh
sudo bash ops/bootstrap.sh
```

### What `bootstrap.sh` does

| Step | Action |
|------|--------|
| System update | `apt-get upgrade -y` |
| UFW firewall | **Allow only**: SSH (22), HTTP (80), HTTPS (443). Everything else is blocked. |
| fail2ban | Protects SSH from brute-force attacks |
| Unattended upgrades | Automatic security patches |
| SSH hardening | Disable password auth; `PermitRootLogin prohibit-password` |
| Service user | Creates a `scanner` system user (`/opt/scanner`) |
| Env dir | Creates `/etc/vulnscanners/` (mode 750) |

### UFW Rules Summary

```
To                 Action      Comment
--                 ------      -------
22/tcp             ALLOW IN    SSH
80/tcp             ALLOW IN    HTTP (Caddy ACME challenge + redirect)
443/tcp            ALLOW IN    HTTPS (Caddy TLS)
Anywhere           DENY IN     (default — everything else blocked)
```

---

## 3. Install Dependencies

```bash
chmod +x ops/install-deps.sh
sudo bash ops/install-deps.sh
```

### What is installed

| Package | Version / Notes |
|---------|-----------------|
| Python  | 3.12 (via `deadsnakes/ppa`) |
| Redis   | System package, bound to `127.0.0.1` only |
| Docker CE | Latest stable via official Docker repo |
| Caddy | Latest stable via Cloudsmith repo |

> Redis is configured to bind only to `127.0.0.1` and has dangerous commands
> (`FLUSHALL`, `FLUSHDB`, `CONFIG`, `DEBUG`) disabled at install time.

---

## 4. Deploy Worker Code

```bash
chmod +x ops/deploy.sh
sudo bash ops/deploy.sh
```

`deploy.sh` performs the following steps:

1. Clones (or pulls) the repo into `/opt/scanner/app`
2. Creates a Python 3.12 venv at `/opt/scanner/venv` and installs
   `requirements.txt`
3. Creates `/etc/vulnscanners/backend.env` (empty, `chmod 600`)
4. Installs systemd unit files from `ops/systemd/` into
   `/etc/systemd/system/`
5. Copies `ops/caddy/Caddyfile` to `/etc/caddy/Caddyfile` and reloads Caddy
6. Enables (but does **not start**) `vulnscanners-api` and
   `vulnscanners-worker` until secrets are populated

### Directory layout after deploy

```
/opt/scanner/
├── app/            ← git checkout of the scanner worker
└── venv/           ← Python 3.12 virtual environment

/etc/vulnscanners/
└── backend.env     ← secrets (chmod 600, owner scanner)

/etc/caddy/
└── Caddyfile       ← Caddy reverse proxy config

/etc/systemd/system/
├── vulnscanners-api.service
└── vulnscanners-worker.service
```

---

## 5. Configure Secrets

> ⚠️ **Never commit real secrets to git.**  
> The file `/etc/vulnscanners/backend.env` is on the server only.

```bash
# Generate a shared webhook secret (do this once, save the output)
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

# Edit the env file on the server
sudo nano /etc/vulnscanners/backend.env
```

Use `ops/env/backend.env.example` as a reference for every variable to set.
The minimum required variables are:

| Variable | Description |
|----------|-------------|
| `GCP_WEBHOOK_SECRET` | Shared HMAC secret — **same value** as Vercel `GCP_WEBHOOK_SECRET` |
| `VERCEL_WEBHOOK_URL` | `https://vulnscanners.com/api/scans/webhook` |
| `FIREBASE_ADMIN_PROJECT_ID` | GCP project ID |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Service-account email |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Service-account private key (newlines as `\n`) |
| `GCS_BUCKET_NAME` | GCS bucket for scan result storage |

After editing, verify file permissions:

```bash
sudo ls -la /etc/vulnscanners/backend.env
# Expected: -rw------- 1 scanner scanner ...
```

---

## 6. Start & Verify Services

```bash
# Start all services
sudo systemctl start vulnscanners-api vulnscanners-worker

# Check status
sudo systemctl status vulnscanners-api vulnscanners-worker caddy redis-server

# Quick health check (should return 200)
curl -sf http://127.0.0.1:8080/health && echo "API OK"

# Verify HTTPS via Caddy (DNS must be propagated first)
curl -sf https://api.vulnscanners.com/health && echo "HTTPS OK"
```

### Service Dependencies

```
redis.service
  └─ vulnscanners-api.service
  └─ vulnscanners-worker.service
       └─ (Celery connects to Redis for task queue)
caddy.service  ← reverse proxy; starts independently
```

### Caddy Configuration Summary

`api.vulnscanners.com` is configured in `ops/caddy/Caddyfile`:

- Automatic HTTPS via Let's Encrypt (ACME HTTP-01 on port 80)
- TLS 1.2 / 1.3 only
- Security headers: `HSTS`, `X-Content-Type-Options`, `X-Frame-Options`, etc.
- Reverse proxies `https://api.vulnscanners.com` → `http://127.0.0.1:8080`
- Access logs in JSON to journald/stderr

---

## 7. Logging & Log Retention

All services write to **journald** via systemd. No separate log files required.

### Live tailing

```bash
# FastAPI app logs
journalctl -u vulnscanners-api -f

# Celery worker logs
journalctl -u vulnscanners-worker -f

# Caddy access/error logs
journalctl -u caddy -f

# All vulnscanners logs together
journalctl -u vulnscanners-api -u vulnscanners-worker -f
```

### Querying logs

```bash
# Last 100 lines for the API service
journalctl -u vulnscanners-api -n 100 --no-pager

# Logs since a specific time
journalctl -u vulnscanners-api --since "2025-01-01 00:00:00"

# Filter by priority (errors only)
journalctl -u vulnscanners-api -p err --no-pager

# JSON output (useful for log shipping)
journalctl -u vulnscanners-api -o json-pretty | head -40
```

### Log retention

Edit `/etc/systemd/journald.conf` to control disk usage:

```ini
[Journal]
# Keep at most 1 GB of logs
SystemMaxUse=1G
# Compress old logs
Compress=yes
# Rotate after 30 days
MaxRetentionSec=30day
```

Apply changes:

```bash
sudo systemctl restart systemd-journald
```

Verify current journal disk usage:

```bash
journalctl --disk-usage
```

---

## 8. Updating the Worker

To deploy a new version of the worker code:

```bash
cd /opt/setup   # the setup repo clone from step 2
git pull        # get the latest ops/ scripts

sudo bash ops/deploy.sh
```

`deploy.sh` is idempotent — it pulls the latest code, updates the venv,
reloads systemd units, and restarts the services.

---

## 9. Vercel Environment Variables

Set `GCP_WEBHOOK_SECRET` in the Vercel **Production** environment so the
Next.js app can authenticate callbacks from the scanner worker.

Run these commands **locally** (you need `vercel` CLI logged into the
`vulnscanners` project):

```bash
# From the Next.js repo root
vercel link --project vulnscanners

# Generate a strong secret (save this — you need it for the server too)
python3 -c "import secrets; print(secrets.token_urlsafe(48))"

# Set in Vercel Production
vercel env add GCP_WEBHOOK_SECRET production
# Paste the secret when prompted

# Verify
vercel env ls
```

Also set the scanner API URL so the Next.js dispatch helper knows where to
send scan jobs:

```bash
vercel env add GCP_SCANNER_URL production
# Enter: https://api.vulnscanners.com
```

---

## 10. Secret Generation Reference

| Secret | Generation Command |
|--------|--------------------|
| `GCP_WEBHOOK_SECRET` | `python3 -c "import secrets; print(secrets.token_urlsafe(48))"` |
| Redis password (optional) | `openssl rand -base64 32` |
| Any 256-bit key | `openssl rand -hex 32` |

---

## 11. Security Checklist

Before going live, verify each item:

- [ ] DNS A record `api.vulnscanners.com` → VPS IP is propagated
- [ ] UFW is enabled: `ufw status verbose` shows only 22/80/443
- [ ] SSH password auth is disabled: `sshd -T | grep passwordauthentication`
      returns `passwordauthentication no`
- [ ] `/etc/vulnscanners/backend.env` is `chmod 600`, owned by `scanner`
- [ ] Redis binds to `127.0.0.1` only: `ss -tlnp | grep 6379` shows `127.0.0.1:6379`
- [ ] FastAPI app binds to `127.0.0.1:8080` only (never 0.0.0.0)
- [ ] Caddy is serving HTTPS with a valid Let's Encrypt cert:
      `curl -I https://api.vulnscanners.com/health`
- [ ] `GCP_WEBHOOK_SECRET` matches in both Vercel (production env) and
      `/etc/vulnscanners/backend.env`
- [ ] No secrets are committed to the git repository
- [ ] SSH access key is not shared or leaked; rotate if in doubt
- [ ] `fail2ban` is active: `systemctl is-active fail2ban`
- [ ] Unattended upgrades are enabled: `systemctl is-enabled unattended-upgrades`
