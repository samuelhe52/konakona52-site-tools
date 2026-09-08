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

Run `python3 server/chatgpt_share_proxy.py` in another terminal to enable URL imports; saved HTML imports work without it. Run `npm run lint` and `npm run build` before sharing changes. See [DEPLOY.md](DEPLOY.md) for the production setup.

The application is licensed under the [MIT License](LICENSE). The separately served UESTC calendar export script is provided under [GPL-3.0](public/licenses/uestc-course2ics-GPL-3.0.txt).
