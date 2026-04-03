#!/usr/bin/env bash
# deploy.sh — Copies scanner files to the Hetzner VPS and starts the service
# Run from repo root: bash gcp/scanner-vm/deploy.sh
set -euo pipefail

# --- Configure these for your Hetzner VPS ---
VPS_IP="${SCANNER_VPS_IP:?Set SCANNER_VPS_IP env var to your Hetzner VPS IP}"
VPS_USER="${SCANNER_VPS_USER:-root}"
REMOTE_DIR="/opt/scanner"
SSH_KEY="${SCANNER_SSH_KEY:-$HOME/.ssh/id_ed25519}"

echo "📦 Copying scanner files to $VPS_USER@$VPS_IP..."
scp -i "$SSH_KEY" \
  gcp/scanner-vm/scanner_server.py \
  gcp/scanner-vm/requirements.txt \
  gcp/scanner-vm/scanner-server.service \
  gcp/scanner-vm/setup.sh \
  gcp/scanner-vm/finish_setup.sh \
  "$VPS_USER@$VPS_IP:/tmp/"

echo "⚙️  Running remote setup..."
ssh -i "$SSH_KEY" "$VPS_USER@$VPS_IP" "
    set -e
    mkdir -p $REMOTE_DIR
    cp /tmp/scanner_server.py $REMOTE_DIR/
    cp /tmp/requirements.txt $REMOTE_DIR/
    cp /tmp/scanner-server.service $REMOTE_DIR/
    cp /tmp/setup.sh $REMOTE_DIR/
    cp /tmp/finish_setup.sh $REMOTE_DIR/
    chmod +x $REMOTE_DIR/setup.sh $REMOTE_DIR/finish_setup.sh
    echo 'Files copied to $REMOTE_DIR'
"

echo ""
echo "✅ Files deployed to $VPS_IP. To finish setup, SSH in and run:"
echo "   ssh -i $SSH_KEY $VPS_USER@$VPS_IP"
echo "   bash /opt/scanner/setup.sh"
echo ""
echo "Then populate /opt/scanner/.env with:"
echo "   SCANNER_TOKEN=<your_secret>"
echo "   GCS_BUCKET=hosted-scanners-reports"
echo "   WEBAPP_WEBHOOK_URL=https://app.hackeranalytics.com/api/scans/webhook"
echo "   GCP_WEBHOOK_SECRET=<your_secret>"
echo ""
echo "Then start the service:"
echo "   sudo systemctl start scanner-server"
echo "   sudo journalctl -u scanner-server -f"
