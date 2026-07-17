#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SSH_HOST="${SSH_HOST:-serJP}"
DOMAIN="${DOMAIN:-tools.konakona52.com}"
REMOTE_SITE_ROOT="${REMOTE_SITE_ROOT:-/var/www/${DOMAIN}}"
RELEASE_ID="${RELEASE_ID:-$(date -u +%Y%m%dT%H%M%SZ)-$(git rev-parse --short=12 HEAD)}"
REMOTE_RELEASE_DIR="${REMOTE_RELEASE_DIR:-${REMOTE_SITE_ROOT}/releases/${RELEASE_ID}}"

verify_public() {
  curl --silent --show-error --fail -I "https://${DOMAIN}" >/dev/null
}

main() {
  cd "${ROOT_DIR}"

  npm run lint
  npm run build

  ssh "${SSH_HOST}" "
    set -euo pipefail
    sudo install -d -m 755 -o \$(id -un) -g www-data '${REMOTE_SITE_ROOT}/releases'
    install -d -m 755 '${REMOTE_RELEASE_DIR}'
  "
  rsync -az --delete "${ROOT_DIR}/dist/" "${SSH_HOST}:${REMOTE_RELEASE_DIR}/"
  ssh "${SSH_HOST}" "
    set -euo pipefail
    cd '${REMOTE_SITE_ROOT}'
    ln -s 'releases/${RELEASE_ID}' '.current-next'
    mv -Tf '.current-next' current
    find releases -mindepth 1 -maxdepth 1 -type d -printf '%T@ %p\\n' | sort -nr | tail -n +6 | cut -d' ' -f2- | xargs -r rm -rf
  "
  verify_public

  printf 'Static release %s deployed: https://%s\n' "${RELEASE_ID}" "${DOMAIN}"
}

main "$@"
