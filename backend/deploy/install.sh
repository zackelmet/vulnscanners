#!/usr/bin/env bash
# Provision a Hetzner VPS to run the vulnscanners backend worker.
# Tested on Debian 12 / Ubuntu 22.04+.
#
# Usage (as root):
#   curl -fsSL https://raw.githubusercontent.com/zackelmet/vulnscanners/<branch>/backend/deploy/install.sh | bash
# or:
#   ./install.sh

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/zackelmet/vulnscanners.git}"
REPO_BRANCH="${REPO_BRANCH:-main}"
INSTALL_DIR="/opt/vulnscanners"
ENV_DIR="/etc/vulnscanners"
ENV_FILE="${ENV_DIR}/backend.env"
SERVICE_USER="vulnscanners"

if [[ "$(id -u)" -ne 0 ]]; then
    echo "must run as root" >&2
    exit 1
fi

echo "==> apt: installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y --no-install-recommends \
    git curl ca-certificates gnupg \
    python3 python3-venv python3-pip \
    nmap \
    debian-keyring debian-archive-keyring apt-transport-https

echo "==> caddy: installing reverse proxy"
if ! command -v caddy >/dev/null 2>&1; then
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
    apt-get update -y
    apt-get install -y caddy
fi

echo "==> nuclei: installing"
if ! command -v nuclei >/dev/null 2>&1; then
    NUCLEI_VERSION="3.3.0"
    ARCH="$(dpkg --print-architecture)"
    case "$ARCH" in
        amd64) NUCLEI_ARCH="linux_amd64" ;;
        arm64) NUCLEI_ARCH="linux_arm64" ;;
        *) echo "unsupported arch: $ARCH"; exit 1 ;;
    esac
    tmp="$(mktemp -d)"
    curl -fsSL -o "$tmp/nuclei.zip" \
        "https://github.com/projectdiscovery/nuclei/releases/download/v${NUCLEI_VERSION}/nuclei_${NUCLEI_VERSION}_${NUCLEI_ARCH}.zip"
    (cd "$tmp" && unzip -o nuclei.zip)
    install -m 0755 "$tmp/nuclei" /usr/local/bin/nuclei
    rm -rf "$tmp"
fi

echo "==> zap: installing OWASP ZAP via docker (optional, only if docker present)"
if command -v docker >/dev/null 2>&1; then
    docker pull ghcr.io/zaproxy/zaproxy:stable || true
fi

echo "==> user: creating ${SERVICE_USER}"
if ! id -u "$SERVICE_USER" >/dev/null 2>&1; then
    useradd --system --create-home --home-dir "/var/lib/${SERVICE_USER}" --shell /usr/sbin/nologin "$SERVICE_USER"
fi

echo "==> repo: cloning to ${INSTALL_DIR}"
mkdir -p "$INSTALL_DIR"
if [[ ! -d "${INSTALL_DIR}/.git" ]]; then
    git clone --branch "$REPO_BRANCH" --depth 1 "$REPO_URL" "$INSTALL_DIR"
else
    git -C "$INSTALL_DIR" fetch --depth 1 origin "$REPO_BRANCH"
    git -C "$INSTALL_DIR" reset --hard "origin/${REPO_BRANCH}"
fi

echo "==> venv: creating Python environment"
python3 -m venv "${INSTALL_DIR}/backend/.venv"
"${INSTALL_DIR}/backend/.venv/bin/pip" install --upgrade pip wheel
"${INSTALL_DIR}/backend/.venv/bin/pip" install -r "${INSTALL_DIR}/backend/requirements.txt"

chown -R "${SERVICE_USER}:${SERVICE_USER}" "$INSTALL_DIR"

echo "==> env: writing ${ENV_FILE}"
mkdir -p "$ENV_DIR"
chmod 750 "$ENV_DIR"
chown root:"${SERVICE_USER}" "$ENV_DIR"
if [[ ! -f "$ENV_FILE" ]]; then
    cp "${INSTALL_DIR}/backend/.env.example" "$ENV_FILE"
    chmod 640 "$ENV_FILE"
    chown root:"${SERVICE_USER}" "$ENV_FILE"
    echo "!! Edit $ENV_FILE and fill in real secrets, then: systemctl restart vulnscanners-backend"
fi

echo "==> systemd: installing service"
install -m 0644 "${INSTALL_DIR}/backend/deploy/vulnscanners-backend.service" \
    /etc/systemd/system/vulnscanners-backend.service
systemctl daemon-reload
systemctl enable vulnscanners-backend.service
systemctl restart vulnscanners-backend.service || true

echo "==> caddy: installing site config"
install -m 0644 "${INSTALL_DIR}/backend/deploy/Caddyfile" /etc/caddy/Caddyfile
systemctl reload caddy || systemctl restart caddy

echo "==> done. Status:"
systemctl --no-pager --full status vulnscanners-backend.service || true
