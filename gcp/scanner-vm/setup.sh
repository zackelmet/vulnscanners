#!/usr/bin/env bash
# setup.sh — Run once on the scanner-vm to install all dependencies
# Usage: sudo bash setup.sh
set -euo pipefail

echo "=== [1/8] System update ==="
apt-get update -q && apt-get upgrade -y -q

echo "=== [2/8] Install system packages ==="
apt-get install -y -q \
  nmap \
  python3 python3-pip python3-venv \
  curl wget gnupg2 ca-certificates \
  default-jdk \
  net-tools

echo "=== [3/8] Install OWASP ZAP ==="
ZAP_VERSION="2.15.0"
ZAP_DIR="/opt/zaproxy"
if [ ! -d "$ZAP_DIR" ]; then
  wget -q "https://github.com/zaproxy/zaproxy/releases/download/v${ZAP_VERSION}/ZAP_${ZAP_VERSION}_Linux.tar.gz" -O /tmp/zap.tar.gz
  tar -xzf /tmp/zap.tar.gz -C /opt
  mv /opt/ZAP_${ZAP_VERSION} "$ZAP_DIR"
  ln -sf "$ZAP_DIR/zap.sh" /usr/local/bin/zap.sh
  # Install ZAP Python API client + baseline script
  pip3 install python-owasp-zap-v2.4
  ln -sf "$ZAP_DIR/zap-baseline.py"  /usr/local/bin/zap-baseline.py  || true
  ln -sf "$ZAP_DIR/zap-full-scan.py" /usr/local/bin/zap-full-scan.py || true
  echo "ZAP installed: $ZAP_DIR"
else
  echo "ZAP already installed, skipping"
fi

echo "=== [4/8] Install OpenVAS (GVM community) ==="
if ! command -v gvmd &>/dev/null; then
  # Add GVM community PPA
  add-apt-repository -y ppa:mrazavi/gvm
  apt-get update -q
  apt-get install -y -q \
    gvm \
    gvmd \
    openvas-scanner \
    gvm-tools \
    python3-gvm
  # Initial setup (feeds, admin user)
  echo "Running gvm-setup (this takes several minutes for NVT feed sync)..."
  gvm-setup 2>&1 || true
  # Save admin password
  ADMIN_PASS=$(gvm-manage-certs -a 2>/dev/null | grep "Admin password" | awk '{print $NF}' || echo "admin")
  echo "$ADMIN_PASS" > /etc/gvm/admin_password
  chmod 600 /etc/gvm/admin_password
  echo "OpenVAS admin password saved to /etc/gvm/admin_password"
else
  echo "OpenVAS already installed, skipping"
fi

echo "=== [5/8] Create scanner user and app directory ==="
id scanner &>/dev/null || useradd -r -s /bin/false -d /opt/scanner scanner
mkdir -p /opt/scanner
chown scanner:scanner /opt/scanner

echo "=== [6/8] Install Python dependencies ==="
python3 -m venv /opt/scanner/venv
/opt/scanner/venv/bin/pip install --upgrade pip -q
/opt/scanner/venv/bin/pip install -r /opt/scanner/requirements.txt -q

echo "=== [7/8] Install systemd service ==="
cp /opt/scanner/scanner-server.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable scanner-server

echo "=== [8/8] Add scanner user to required groups ==="
usermod -aG gvm scanner 2>/dev/null || true

echo ""
echo "✅ Setup complete!"
echo "   Next: populate /opt/scanner/.env, then: systemctl start scanner-server"
echo "   Check logs: journalctl -u scanner-server -f"
