#!/usr/bin/env bash
# Deploy the VulnScanners worker to the Hetzner scanner host.
#
# Usage:
#   ./deploy.sh
#
# Override via env:
#   WORKER_HOST     — IP or hostname of the worker box (default: 178.104.172.54)
#   WORKER_USER     — SSH user                          (default: root)
#   WORKER_SSH_KEY  — Path to the SSH key               (default: ~/.ssh/vulnscanners_hetzner_ed25519)
#
# What this does:
#   1. Python syntax-check the local app.py
#   2. scp app.py + requirements.txt to /opt/vulnscanners/backend/
#   3. Reinstall pip deps if requirements.txt changed
#   4. Restart the systemd service and verify /health

set -euo pipefail

HOST="${WORKER_HOST:-178.104.172.54}"
USER="${WORKER_USER:-root}"
KEY="${WORKER_SSH_KEY:-$HOME/.ssh/vulnscanners_hetzner_ed25519}"
REMOTE="$USER@$HOST"

cd "$(dirname "$0")"

echo "→ Syntax-checking app.py locally"
python3 -c "import ast; ast.parse(open('app.py').read())"

echo "→ Diffing remote app.py"
REMOTE_HASH=$(ssh -i "$KEY" "$REMOTE" 'sha256sum /opt/vulnscanners/backend/app.py 2>/dev/null | cut -d" " -f1 || echo none')
LOCAL_HASH=$(sha256sum app.py | cut -d" " -f1)
if [ "$LOCAL_HASH" = "$REMOTE_HASH" ]; then
  echo "  app.py unchanged ($LOCAL_HASH)"
else
  echo "  app.py changed: $REMOTE_HASH → $LOCAL_HASH"
fi

echo "→ scp app.py + requirements.txt"
scp -i "$KEY" app.py requirements.txt "$REMOTE:/opt/vulnscanners/backend/"

echo "→ pip install -r requirements.txt (idempotent)"
ssh -i "$KEY" "$REMOTE" '/opt/vulnscanners/backend/.venv/bin/pip install -q -r /opt/vulnscanners/backend/requirements.txt'

echo "→ Restart service"
ssh -i "$KEY" "$REMOTE" 'systemctl restart vulnscanners-scanner'

echo "→ Health check"
ssh -i "$KEY" "$REMOTE" 'sleep 2 && systemctl is-active vulnscanners-scanner && curl -s http://127.0.0.1:8080/health'
echo
echo "✓ Deployed."
