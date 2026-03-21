#!/usr/bin/env bash
# deploy.sh — Copies scanner files to the VM and starts the service
# Run from repo root: bash gcp/scanner-vm/deploy.sh
set -euo pipefail

VM_NAME="scanner-vm"
ZONE="us-central1-a"
PROJECT="hosted-scanners"
REMOTE_DIR="/opt/scanner"

echo "📦 Copying scanner files to $VM_NAME..."
gcloud compute scp \
  gcp/scanner-vm/scanner_server.py \
  gcp/scanner-vm/requirements.txt \
  gcp/scanner-vm/scanner-server.service \
  gcp/scanner-vm/setup.sh \
  "${VM_NAME}:/tmp/" \
  --zone="$ZONE" --project="$PROJECT"

echo "⚙️  Running remote setup..."
gcloud compute ssh "$VM_NAME" \
  --zone="$ZONE" --project="$PROJECT" \
  --command="
    set -e
    sudo mkdir -p $REMOTE_DIR
    sudo cp /tmp/scanner_server.py $REMOTE_DIR/
    sudo cp /tmp/requirements.txt $REMOTE_DIR/
    sudo cp /tmp/scanner-server.service $REMOTE_DIR/
    sudo cp /tmp/setup.sh $REMOTE_DIR/
    sudo chmod +x $REMOTE_DIR/setup.sh
    echo 'Files copied to $REMOTE_DIR'
  "

echo ""
echo "✅ Files deployed. To finish setup, SSH in and run:"
echo "   gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT"
echo "   sudo bash /opt/scanner/setup.sh"
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
