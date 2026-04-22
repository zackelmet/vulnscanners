#!/usr/bin/env bash
# Bootstrap a fresh Debian/Ubuntu Hetzner VPS for the scanner worker.
# Run as root (or with sudo) on the VPS.

set -euo pipefail

APP_DIR="/opt/vulnscanners-scanner"
REPO_URL="${REPO_URL:-https://github.com/zackelmet/vulnscanners.git}"
BRANCH="${BRANCH:-main}"

if [[ $EUID -ne 0 ]]; then
  echo "run as root" >&2
  exit 1
fi

apt-get update
apt-get install -y --no-install-recommends \
  ca-certificates curl git ufw

# Docker Engine + compose plugin
if ! command -v docker >/dev/null; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg \
    | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
    https://download.docker.com/linux/${ID} ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

# Firewall: allow SSH, HTTP, HTTPS only
ufw --force reset
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Clone / update repo
if [[ ! -d "${APP_DIR}/.git" ]]; then
  git clone --depth 1 --branch "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
else
  git -C "${APP_DIR}" fetch origin "${BRANCH}"
  git -C "${APP_DIR}" checkout "${BRANCH}"
  git -C "${APP_DIR}" reset --hard "origin/${BRANCH}"
fi

WORK_DIR="${APP_DIR}/scanner-server"
cd "${WORK_DIR}"

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo
  echo "==> Created ${WORK_DIR}/.env from template."
  echo "==> EDIT IT NOW and fill in the real secrets, hostname, etc:"
  echo "      nano ${WORK_DIR}/.env"
  echo
  echo "==> Also upload the GCP service account JSON to:"
  echo "      ${WORK_DIR}/gcp-key.json"
  echo
  echo "Re-run this script once those are in place."
  exit 0
fi

if [[ ! -f gcp-key.json ]]; then
  echo "ERROR: ${WORK_DIR}/gcp-key.json is missing. Upload the GCP SA key first." >&2
  exit 1
fi

# Install and enable systemd unit pointing at this working dir
ln -sf "${WORK_DIR}" /opt/vulnscanners-scanner
install -m 0644 "${WORK_DIR}/deploy/systemd/vulnscanners-scanner.service" \
  /etc/systemd/system/vulnscanners-scanner.service
systemctl daemon-reload
systemctl enable vulnscanners-scanner.service

# Build and start
docker compose pull || true
docker compose build
systemctl restart vulnscanners-scanner.service

echo
echo "Scanner is starting. Check status with:"
echo "  systemctl status vulnscanners-scanner"
echo "  docker compose -f ${WORK_DIR}/docker-compose.yml logs -f scanner"
