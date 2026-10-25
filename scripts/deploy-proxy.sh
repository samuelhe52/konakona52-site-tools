#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_HOST="${SSH_HOST:-serJP}"
DOMAIN="${DOMAIN:-tools.konakona.dev}"
REMOTE_PROXY_DIR="${REMOTE_PROXY_DIR:-/opt/konakona52-chatgpt-share-proxy}"

main() {
  cd "${ROOT_DIR}"

  # Fail before any remote mutation if the runtime or local build is missing.
  ssh "${SSH_HOST}" "/usr/bin/node --input-type=module -e 'if (Number(process.versions.node.split(\".\")[0]) < 22) process.exit(1)'"
  npm run build:api

  ssh "${SSH_HOST}" "mkdir -p /tmp/konakona52-chatgpt-share-proxy"
  rsync -az --delete "${ROOT_DIR}/dist-ssr/" "${SSH_HOST}:/tmp/konakona52-chatgpt-share-proxy/"
  rsync -az "${ROOT_DIR}/deploy/systemd/konakona-chatgpt-share-proxy.service" "${SSH_HOST}:/tmp/"
  rsync -az "${ROOT_DIR}/deploy/nginx/konakona-rate-limits.conf" "${SSH_HOST}:/tmp/"
  rsync -az "${ROOT_DIR}/deploy/nginx/tools.konakona52.com.conf" "${SSH_HOST}:/tmp/"

  ssh "${SSH_HOST}" "
    set -euo pipefail
    sudo install -d -m 755 -o www-data -g www-data '${REMOTE_PROXY_DIR}'
    sudo install -m 755 -o root -g root /tmp/konakona52-chatgpt-share-proxy/index.mjs '${REMOTE_PROXY_DIR}/index.mjs'
    sudo install -m 644 -o root -g root /tmp/konakona-chatgpt-share-proxy.service /etc/systemd/system/konakona-chatgpt-share-proxy.service
    sudo install -m 644 -o root -g root /tmp/konakona-rate-limits.conf /etc/nginx/conf.d/konakona-rate-limits.conf
    sudo install -m 644 -o root -g root /tmp/tools.konakona52.com.conf /etc/nginx/sites-available/tools.konakona52.com.conf
    sudo ln -sfn /etc/nginx/sites-available/tools.konakona52.com.conf /etc/nginx/sites-enabled/tools.konakona52.com.conf
    sudo systemctl daemon-reload
    sudo systemctl enable --now konakona-chatgpt-share-proxy
    sudo systemctl restart konakona-chatgpt-share-proxy
    sudo nginx -t
    sudo systemctl reload nginx
  "

  sleep 3
  curl --silent --show-error --fail "https://${DOMAIN}/api/chatgpt-share/health" >/dev/null
  curl --silent --show-error --fail -I "https://${DOMAIN}" >/dev/null
  printf 'Tools API deployed: https://%s/api/chatgpt-share/health\n' "${DOMAIN}"
}

main "$@"
