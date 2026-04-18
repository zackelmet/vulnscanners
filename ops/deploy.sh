#!/usr/bin/env bash
# ops/deploy.sh
# Deploy (or update) the VulnScanners scanner worker on the Hetzner VPS.
# Run as root (or sudo) after install-deps.sh has completed.
#
# What this script does:
#   1. Clones (or pulls) the scanner worker repo
#   2. Creates / re-creates the Python 3.12 venv and installs requirements
#   3. Ensures /etc/vulnscanners/backend.env exists and is chmod 600
#   4. Installs and enables systemd units for the FastAPI app and Celery worker
#   5. Installs the Caddy config and reloads Caddy
#
# Usage (first deploy):
#   sudo bash ops/deploy.sh
#
# Usage (re-deploy / update):
#   sudo bash ops/deploy.sh

set -euo pipefail

# ---------------------------------------------------------------------------
# Configuration — adjust to match your environment
# ---------------------------------------------------------------------------
REPO_URL="${SCANNER_REPO_URL:-https://github.com/zackelmet/vulnscanners.git}"
REPO_BRANCH="${SCANNER_REPO_BRANCH:-main}"
APP_DIR="/opt/scanner/app"
VENV_DIR="/opt/scanner/venv"
ENV_FILE="/etc/vulnscanners/backend.env"
SERVICE_USER="scanner"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# ---------------------------------------------------------------------------

echo "=== [1/6] Clone or update repo ==="
if [[ -d "$APP_DIR/.git" ]]; then
  echo "Repo already exists — pulling latest from $REPO_BRANCH"
  git -C "$APP_DIR" fetch --all
  git -C "$APP_DIR" checkout "$REPO_BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$REPO_BRANCH"
else
  echo "Cloning $REPO_URL ($REPO_BRANCH) → $APP_DIR"
  install -d -m 750 -o "$SERVICE_USER" -g "$SERVICE_USER" "$(dirname "$APP_DIR")"
  sudo -u "$SERVICE_USER" git clone --branch "$REPO_BRANCH" "$REPO_URL" "$APP_DIR"
fi

echo "=== [2/6] Create / update Python 3.12 venv ==="
if [[ ! -x "$VENV_DIR/bin/python" ]]; then
  sudo -u "$SERVICE_USER" python3.12 -m venv "$VENV_DIR"
fi

REQUIREMENTS="$APP_DIR/requirements.txt"
if [[ -f "$REQUIREMENTS" ]]; then
  sudo -u "$SERVICE_USER" "$VENV_DIR/bin/pip" install --quiet --upgrade pip
  sudo -u "$SERVICE_USER" "$VENV_DIR/bin/pip" install --quiet -r "$REQUIREMENTS"
  echo "Python dependencies installed."
else
  echo "WARNING: $REQUIREMENTS not found — skipping pip install."
fi

echo "=== [3/6] Ensure env file exists with safe permissions ==="
install -d -m 750 -o "$SERVICE_USER" -g "$SERVICE_USER" /etc/vulnscanners

if [[ ! -f "$ENV_FILE" ]]; then
  install -m 600 -o "$SERVICE_USER" -g "$SERVICE_USER" /dev/null "$ENV_FILE"
  echo "Created empty $ENV_FILE — fill it with secrets before starting services."
  echo "  Template: $SCRIPT_DIR/env/backend.env.example"
else
  echo "$ENV_FILE already exists — preserving existing values."
fi
# Enforce permissions regardless
chown "$SERVICE_USER:$SERVICE_USER" "$ENV_FILE"
chmod 600 "$ENV_FILE"

echo "=== [4/6] Install systemd unit files ==="
SYSTEMD_DIR="$SCRIPT_DIR/systemd"
for UNIT in vulnscanners-api.service vulnscanners-worker.service; do
  if [[ -f "$SYSTEMD_DIR/$UNIT" ]]; then
    cp "$SYSTEMD_DIR/$UNIT" "/etc/systemd/system/$UNIT"
    echo "Installed /etc/systemd/system/$UNIT"
  else
    echo "WARNING: $SYSTEMD_DIR/$UNIT not found — skipping."
  fi
done
systemctl daemon-reload

echo "=== [5/6] Install Caddy config ==="
CADDYFILE_SRC="$SCRIPT_DIR/caddy/Caddyfile"
if [[ -f "$CADDYFILE_SRC" ]]; then
  cp "$CADDYFILE_SRC" /etc/caddy/Caddyfile
  caddy validate --config /etc/caddy/Caddyfile
  systemctl reload-or-restart caddy
  echo "Caddy config installed and reloaded."
else
  echo "WARNING: $CADDYFILE_SRC not found — skipping Caddy config."
fi

echo "=== [6/6] Enable and start services ==="
systemctl enable --now redis-server
systemctl enable vulnscanners-api vulnscanners-worker

if [[ -f "$ENV_FILE" ]] && [[ -s "$ENV_FILE" ]]; then
  systemctl restart vulnscanners-api vulnscanners-worker
  echo "Services restarted."
else
  echo ""
  echo "!!! $ENV_FILE is empty — populate it before starting services:"
  echo "    sudo nano $ENV_FILE"
  echo "    sudo systemctl start vulnscanners-api vulnscanners-worker"
fi

echo
echo "=== deploy.sh complete ==="
echo "Verify service status:"
echo "  systemctl status vulnscanners-api vulnscanners-worker caddy redis-server"
echo "Tail logs:"
echo "  journalctl -u vulnscanners-api -f"
echo "  journalctl -u vulnscanners-worker -f"
