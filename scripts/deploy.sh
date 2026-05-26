#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_HOST="${SSH_HOST:-serHK}"
DOMAIN="${DOMAIN:-tools.konakona52.com}"
REMOTE_SITE_ROOT="${REMOTE_SITE_ROOT:-/var/www/${DOMAIN}}"
REMOTE_DIST_DIR="${REMOTE_DIST_DIR:-${REMOTE_SITE_ROOT}/dist}"

verify_public() {
  curl --silent --show-error --fail -I "https://${DOMAIN}" >/dev/null
}

main() {
  cd "${ROOT_DIR}"

  npm run lint
  npm run build

  ssh "${SSH_HOST}" "
    set -euo pipefail
    sudo install -d -m 755 -o \$(id -un) -g www-data '${REMOTE_SITE_ROOT}'
    sudo install -d -m 755 -o \$(id -un) -g www-data '${REMOTE_DIST_DIR}'
  "
  rsync -az --delete "${ROOT_DIR}/dist/" "${SSH_HOST}:${REMOTE_DIST_DIR}/"
  verify_public

  printf 'Deployment complete: https://%s\n' "${DOMAIN}"
}

main "$@"
