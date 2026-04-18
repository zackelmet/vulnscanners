#!/usr/bin/env bash
# ops/bootstrap.sh
# Harden a fresh Ubuntu 24.04 VPS for the VulnScanners scanner worker.
# Run as root (or sudo) immediately after first login.
#
# Usage:
#   chmod +x ops/bootstrap.sh
#   sudo bash ops/bootstrap.sh

set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

echo "=== [1/6] System update & essential packages ==="
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  ufw \
  fail2ban \
  unattended-upgrades \
  apt-transport-https \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  software-properties-common \
  git \
  vim \
  htop \
  jq

echo "=== [2/6] UFW firewall — allow SSH + HTTP/HTTPS only ==="
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp   comment 'SSH'
ufw allow 80/tcp   comment 'HTTP (Caddy ACME challenge + redirect)'
ufw allow 443/tcp  comment 'HTTPS (Caddy TLS)'
ufw --force enable
ufw status verbose

echo "=== [3/6] fail2ban (SSH brute-force protection) ==="
systemctl enable --now fail2ban

echo "=== [4/6] Unattended security upgrades ==="
dpkg-reconfigure -plow unattended-upgrades

echo "=== [5/6] Disable root password login via SSH ==="
# Allow key-based auth; disable password auth
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
systemctl reload ssh

echo "=== [6/6] Create service user 'scanner' ==="
if ! id -u scanner &>/dev/null; then
  useradd --system --shell /bin/bash --create-home --home-dir /opt/scanner scanner
  echo "User 'scanner' created."
else
  echo "User 'scanner' already exists."
fi

# Env file directory — populated by ops/deploy.sh
install -d -m 750 -o scanner -g scanner /etc/vulnscanners

echo
echo "=== bootstrap.sh complete ==="
echo "Next step: run ops/install-deps.sh"
