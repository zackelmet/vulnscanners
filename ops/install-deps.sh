#!/usr/bin/env bash
# ops/install-deps.sh
# Install Docker, Redis, Python 3.12, and Caddy on Ubuntu 24.04.
# Run as root (or sudo) after bootstrap.sh has completed.
#
# Usage:
#   chmod +x ops/install-deps.sh
#   sudo bash ops/install-deps.sh

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "=== [1/4] Install Python 3.12 ==="
add-apt-repository -y ppa:deadsnakes/ppa
apt-get update -y
apt-get install -y python3.12 python3.12-venv python3.12-dev python3-pip
python3.12 --version

echo "=== [2/4] Install Redis ==="
apt-get install -y redis-server
# Bind Redis to localhost only (never expose to internet)
sed -i 's/^bind .*/bind 127.0.0.1 ::1/' /etc/redis/redis.conf
# Disable dangerous commands
cat >> /etc/redis/redis.conf <<'EOF'

# VulnScanners hardening
rename-command FLUSHALL ""
rename-command FLUSHDB  ""
rename-command CONFIG   ""
rename-command DEBUG    ""
EOF
systemctl enable --now redis-server
echo "Redis status:"
systemctl is-active redis-server

echo "=== [3/4] Install Docker CE ==="
# Remove any old Docker installations
apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  > /etc/apt/sources.list.d/docker.list

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
systemctl enable --now docker
# Allow 'scanner' user to manage Docker without sudo
usermod -aG docker scanner
docker --version

echo "=== [4/4] Install Caddy ==="
apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
  | tee /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y caddy
systemctl enable caddy
caddy version

echo
echo "=== install-deps.sh complete ==="
echo "Next steps:"
echo "  1. Copy ops/caddy/Caddyfile to /etc/caddy/Caddyfile"
echo "  2. Copy ops/systemd/*.service to /etc/systemd/system/"
echo "  3. Run ops/deploy.sh to deploy the scanner worker code"
echo "  OR use ops/deploy.sh which automates all of the above"
