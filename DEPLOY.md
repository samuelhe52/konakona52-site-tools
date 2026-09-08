# Deployment

This site deploys behind the existing Nginx site on `serJP`. The web app stays static;
the ChatGPT Share exporter uses one small, memory-only Python proxy solely to retrieve
the public share HTML that browsers cannot retrieve cross-origin.

## Default target

- SSH host: `serJP`
- Domain: `tools.konakona.dev` (legacy `.com` remains dual-served during migration)
- Release root on server: `/var/www/tools.konakona52.com/releases`
- Live site symlink: `/var/www/tools.konakona52.com/current`
- Proxy service: `konakona-chatgpt-share-proxy.service` on `127.0.0.1:8765`

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

## Proxy boundary and privacy

`POST /api/chatgpt-share/fetch` accepts only a ChatGPT share UUID; it constructs the fixed
`https://chatgpt.com/share/<UUID>` upstream itself. It rejects arbitrary URLs, redirects,
oversized/non-HTML responses, invalid origins, and excess requests. Nginx and the service
both rate-limit it. It accepts no ChatGPT cookies or credentials.

The proxy sets `Cache-Control: no-store`, writes no request/response-body logs, uses no
database or disk cache, and holds the fetched HTML only long enough to return it to the
browser. Parsing and archive creation occur in the browser. An HTML import path remains
available for people who prefer not to use the proxy.

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
