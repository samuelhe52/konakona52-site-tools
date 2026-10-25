# Kona's Toolbox

A small bilingual collection of browser-based utilities built with React and Vite.

Deployed at [tools.konakona.dev](https://tools.konakona.dev).

- Convert between plain UESTC URLs and WebVPN URLs, download PDFs embedded in announcements, and export course calendars.
- Export public ChatGPT shared conversations as Markdown or ZIP.
- Preview Markdown with GFM, KaTeX, syntax highlighting, and Mermaid.

## Development

```bash
npm install
npm run dev
```

Run `npm run build:api && npm run start:api` in another terminal to enable the API and URL imports. The API requires Node.js 22 or later; saved HTML imports work without it. Run `npm run lint` and `npm run build` before sharing changes. See [DEPLOY.md](DEPLOY.md) for the production setup.


## HTTP API

Agents and CLI clients can call the tools directly. No API key, browser session, or
`Origin` header is required. See [`public/llms.txt`](public/llms.txt) for concise
instructions and [`public/openapi.json`](public/openapi.json) for the full contract.
These files are served at `/llms.txt` and `/openapi.json`.

Export a public ChatGPT share as Markdown:

```bash
curl --fail-with-body https://tools.konakona.dev/api/chatgpt-share/export \
  -H 'Content-Type: application/json' \
  --data '{"url":"https://chatgpt.com/share/<UUID>","format":"markdown"}' \
  -o conversation.md
```

Set `format` to `zip` and use `-o conversation.zip` for a bundle. Alternatively,
send `shareId` instead of `url`. Send exactly one source. Success returns file bytes
with `Content-Disposition`, rather than a JSON wrapper or a stored download URL.
A ZIP contains `conversation.md`, `attachment-manifest.json`, and public files that
the service can retrieve. Read the manifest for omissions. Files requiring a
ChatGPT login are unavailable through the public-share API. Public attachment
hosts are limited to `oaiusercontent.com` and its subdomains, plus
`oaidalleapiprodscus.blob.core.windows.net`; all addresses must be public.

Convert a university URL:

```bash
curl --fail-with-body https://tools.konakona.dev/api/webvpn/convert \
  -H 'Content-Type: application/json' \
  --data '{"direction":"encode","url":"https://www.uestc.edu.cn/"}'
```

Use `decode` for a UESTC WebVPN URL. The JSON response contains `direction`,
`input`, and `output`. Conversion does not request the URL or require university
credentials. Supported protocols: HTTP, HTTPS, SSH, VNC, Telnet, and RDP.

Errors return a non-2xx status and JSON such as `{"error":"invalid_url"}`.
Check the HTTP status or curl exit code before treating an output file as an export.
Request bodies are limited to 4 KiB. Fetch/export share a limit of six requests per
minute per IP; conversion allows 60. At most two fetch/export requests run at once.
Exports have a 60-second deadline, a 12 MiB HTML limit, and attachment limits of
16 attempts, 12 MiB per file, and 48 MiB total. Nginx also controls request bursts.
Browser clients with an `Origin` header must use an allowed origin. Export content
stays in memory for the request; the service keeps no export files or body logs.

For local calls, replace the origin with `http://127.0.0.1:8765`. Vite proxies
`/api/*` to that service during development. Markdown preview and university
PDF/calendar scripts remain browser tools without hosted APIs.

The application is licensed under the [MIT License](LICENSE). The separately served UESTC calendar export script is provided under [GPL-3.0](public/licenses/uestc-course2ics-GPL-3.0.txt).
