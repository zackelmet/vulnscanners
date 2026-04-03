#!/usr/bin/env bash
# setup.sh — Run once on the scanner VM to install all dependencies
# Usage: sudo bash setup.sh
set -euo pipefail

echo "=== [1/7] System update ==="
apt-get update -q && apt-get upgrade -y -q

echo "=== [2/7] Install system packages ==="
apt-get install -y -q \
  nmap \
  python3 python3-pip python3-venv \
  curl wget gnupg2 ca-certificates \
  default-jdk \
  net-tools \
  unzip

echo "=== [3/7] Install OWASP ZAP ==="
ZAP_VERSION="2.15.0"
ZAP_DIR="/opt/zaproxy"
if [ ! -d "$ZAP_DIR" ]; then
  wget -q "https://github.com/zaproxy/zaproxy/releases/download/v${ZAP_VERSION}/ZAP_${ZAP_VERSION}_Linux.tar.gz" -O /tmp/zap.tar.gz
  tar -xzf /tmp/zap.tar.gz -C /opt
  mv /opt/ZAP_${ZAP_VERSION} "$ZAP_DIR"
  ln -sf "$ZAP_DIR/zap.sh" /usr/local/bin/zap.sh
  pip3 install python-owasp-zap-v2.4
  ln -sf "$ZAP_DIR/zap-baseline.py"  /usr/local/bin/zap-baseline.py  || true
  ln -sf "$ZAP_DIR/zap-full-scan.py" /usr/local/bin/zap-full-scan.py || true
  echo "ZAP installed: $ZAP_DIR"
else
  echo "ZAP already installed, skipping"
fi

echo "=== [4/7] Install Nuclei ==="
if ! command -v nuclei &>/dev/null; then
  NUCLEI_VERSION="3.3.7"
  wget -q "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_linux_amd64.zip" -O /tmp/nuclei.zip
  unzip -o /tmp/nuclei.zip -d /usr/local/bin/
  chmod +x /usr/local/bin/nuclei
  rm /tmp/nuclei.zip
  # Download default templates
  nuclei -update-templates -silent || true
  echo "Nuclei installed: $(nuclei -version 2>&1 | head -1)"
else
  echo "Nuclei already installed: $(nuclei -version 2>&1 | head -1)"
  nuclei -update-templates -silent || true
fi

echo "=== [5/7] Create scanner user and app directory ==="
id scanner &>/dev/null || useradd -r -s /bin/false -d /opt/scanner scanner
mkdir -p /opt/scanner
chown scanner:scanner /opt/scanner

echo "=== [6/7] Install Python dependencies ==="
python3 -m venv /opt/scanner/venv
/opt/scanner/venv/bin/pip install --upgrade pip -q
/opt/scanner/venv/bin/pip install -r /opt/scanner/requirements.txt -q

echo "=== [7/7] Install systemd service ==="
cp /opt/scanner/scanner-server.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable scanner-server

echo ""
echo "✅ Setup complete!"
echo "   Next: populate /opt/scanner/.env, then: systemctl start scanner-server"
echo "   Check logs: journalctl -u scanner-server -f"
