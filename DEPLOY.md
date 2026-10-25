# Deployment

This site deploys behind the existing Nginx site on `serJP`. The web app stays static;
one small, memory-only Node API retrieves public ChatGPT share HTML, exports
Markdown/ZIP files, and converts UESTC WebVPN URLs. Browser exports still use
the same shared TypeScript tool functions.

## Default target

- SSH host: `serJP`
- Domain: `tools.konakona.dev` (legacy `.com` remains dual-served during migration)
- Release root on server: `/var/www/tools.konakona52.com/releases`
- Live site symlink: `/var/www/tools.konakona52.com/current`
- API service (existing service name retained): `konakona-chatgpt-share-proxy.service` on `127.0.0.1:8765`

## Command

```bash
make deploy
```

The deploy command will:

1. Run `npm run lint` and `npm run build`.
2. Sync `dist/` to a timestamped release directory and atomically switch `current`.
3. Keep the five most recent static releases for rollback.
4. Install the proxy service and Nginx configuration, then validate both Nginx and its public health endpoint.
5. Verify the public HTTPS endpoint.

Use `make deploy-static` or `make deploy-proxy` for the respective portions.

## Analytics

`public/scripts/analytics.js` loads Cloudflare Web Analytics after `window.load`,
preserving the current token, SPA tracking and EU exclusion. Deploy this loader
before disabling automatic RUM injection for this hostname. The hostname-scoped
Cloudflare rule and cutover instructions live in the Blog repository under
`infra/cloudflare/manual-analytics.json` and `docs/analytics.md`. Do not disable
analytics across the whole zone: other hosted applications still use injection.

## API boundary and privacy

- `POST /api/chatgpt-share/fetch` accepts only a share UUID and returns HTML for the browser UI.
- `POST /api/chatgpt-share/export` accepts one share UUID or public URL, and `format: "markdown"` or `"zip"`. It returns file bytes directly.
- `POST /api/webvpn/convert` accepts `direction: "encode"` or `"decode"` and a URL. It returns JSON and makes no upstream request.
- `/llms.txt` and `/openapi.json` document the operations. Unknown API paths return JSON 404.

The API constructs the fixed `https://chatgpt.com/share/<UUID>` upstream itself.
It rejects arbitrary share hosts, upstream redirects, oversized/non-HTML responses,
invalid browser origins, and excess requests. CLI clients can omit `Origin`.
It accepts no ChatGPT cookies or credentials. The browser's saved-HTML import
continues to operate without the service.

Public attachment downloads accept only HTTPS `oaiusercontent.com` and its
subdomains, plus `oaidalleapiprodscus.blob.core.windows.net`. DNS addresses must
be public and are pinned to the TLS connection. Redirects repeat the same rules.
Files on other hosts or requiring an authenticated ChatGPT session are omitted;
`attachment-manifest.json` records each outcome. A successful ZIP can be partial.

The service sets `Cache-Control: no-store`, writes no body or request-detail logs,
and uses no database, export store, or disk cache. Parsing and ZIP construction
for API calls occur in server memory for the request. Browser export operations
remain local after the HTML fetch. Nginx disables request and response spooling
and API access logs. Do not enable CDN caching, body capture, or proxy buffering
for these routes. No browser synchronization or retained result pages exist.

Limits: 4 KiB JSON bodies, 12 MiB share HTML, 16 attachment attempts, 12 MiB per
attachment, 48 MiB total attachments, two redirects per attachment, 15 seconds
per upstream request, and 60 seconds per export. Fetch/export share six requests
per minute per IP and two active requests globally. Conversion allows 60 per
minute per IP. Nginx also controls bursts and per-IP export concurrency. JSON
errors use non-2xx statuses; 429/503 responses include `Retry-After`.

## Runtime and release checks

The API requires `/usr/bin/node` version 22 or later on `serJP`. The deploy scripts
do not install or change the server runtime. `npm run build` type-checks both
applications and builds the static site plus `dist-ssr/index.mjs`. The API bundle
contains its dependencies; production does not run npm install. `make deploy-proxy`
rebuilds that bundle and checks the remote Node version before it installs files.

The systemd service keeps its existing name and directory. It runs the Node
bundle with a 256 MiB V8 heap, 512 MiB service memory budget, and one CPU quota.
Nginx allows 75 seconds for an export response. Confirm these budgets against
representative bundles before increasing concurrency or file limits.

Before release, run lint/build and one-off manual acceptance checks: direct
Markdown/ZIP downloads, manifest omissions and ZIP integrity, URL round trips,
invalid input, origin rules, rate limits, unknown paths, unsafe download hosts,
and current browser tools. This repository does not maintain automated tests.
After release, fetch `/llms.txt` and `/openapi.json`, confirm API JSON errors, and
repeat the download/conversion checks against the public hostname.

## One-off server setup

The first `make deploy` installs the required service and Nginx files. It requires the
`serJP` SSH target to have passwordless sudo for the deployment user.

Before publishing the Share Export route, probe a public share from the deployment host. If
ChatGPT blocks that host, leave the route unpublished: the HTML-import path still works, but a
proxy error is not an acceptable substitute for the normal URL workflow.

## Overrides

These environment variables can be set when you need a different target:

```bash
SSH_HOST=serJP DOMAIN=tools.konakona.dev make deploy
```

Optional:

- `REMOTE_SITE_ROOT`
- `REMOTE_RELEASE_DIR`
- `RELEASE_ID`
- `REMOTE_PROXY_DIR`
