import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { bundleConversation } from '../src/lib/chatgptBundle'
import { markdownFor, parseSharedConversation, parseShareUrl } from '../src/lib/chatgptShare'
import { safeFilename } from '../src/lib/downloads'
import { convertWebvpnUrl } from '../src/lib/webvpn'
import { downloadPublic, isAttachmentUrl } from './publicDownload'

const origins = new Set((process.env.ALLOWED_ORIGINS ?? 'http://localhost:5173').split(',').map(value => value.trim()))
const SHARE_ID = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i
const routes = new Map([
  ['/api/chatgpt-share/health', 'GET, HEAD'],
  ['/api/chatgpt-share/fetch', 'POST, OPTIONS'],
  ['/api/chatgpt-share/export', 'POST, OPTIONS'],
  ['/api/webvpn/convert', 'POST, OPTIONS'],
])
const requests = new Map<string, { expires: number; count: number }>()
let activeExports = 0

class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string) {
    super(code)
    this.status = status
    this.code = code
  }
}

function rateLimit(key: string, limit: number) {
  const now = Date.now()
  for (const [entry, value] of requests) if (value.expires <= now) requests.delete(entry)
  const record = requests.get(key)
  if (record && record.count >= limit || !record && requests.size >= 10_000) throw new ApiError(429, 'rate_limited')
  requests.set(key, { expires: record?.expires ?? now + 60_000, count: (record?.count ?? 0) + 1 })
}

function send(res: ServerResponse, status: number, body: string | Uint8Array, type: string) {
  if (res.destroyed) return
  res.statusCode = status
  res.setHeader('Content-Type', type)
  res.setHeader('Content-Length', typeof body === 'string' ? Buffer.byteLength(body) : body.byteLength)
  res.end(body)
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  if (req.headers['content-type']?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') {
    throw new ApiError(415, 'unsupported_media_type')
  }
  if (Number(req.headers['content-length'] ?? 0) > 4096) throw new ApiError(413, 'request_too_large')
  let size = 0
  const chunks: Buffer[] = []
  for await (const chunk of req.iterator({ destroyOnReturn: false })) {
    size += chunk.byteLength
    if (size > 4096) throw new ApiError(413, 'request_too_large')
    chunks.push(chunk)
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error()
    return body as Record<string, unknown>
  } catch { throw new ApiError(400, 'invalid_request') }
}

function sourceFrom(body: Record<string, unknown>, rawFetch: boolean) {
  if (rawFetch ? Object.keys(body).some(key => key !== 'shareId')
    : Object.keys(body).some(key => !['url', 'shareId', 'format'].includes(key))) throw new ApiError(400, 'invalid_request')
  if (typeof body.shareId === 'string' && SHARE_ID.test(body.shareId) && !('url' in body)) {
    const shareId = body.shareId.toLowerCase()
    return { shareId, sourceUrl: `https://chatgpt.com/share/${shareId}` }
  }
  if (!rawFetch && typeof body.url === 'string' && !('shareId' in body)) {
    try { return parseShareUrl(body.url) } catch { /* Return a stable code without reflecting input. */ }
  }
  throw new ApiError(400, 'invalid_request')
}

function downloadName(res: ServerResponse, title: string, extension: string) {
  const name = `${safeFilename(title)}.${extension}`
  // encodeURIComponent rejects lone surrogates. Buffer replaces them with U+FFFD.
  const unicode = Buffer.from(name).toString('utf8')
  const encoded = encodeURIComponent(unicode).replace(/['()*]/g, value => `%${value.charCodeAt(0).toString(16).toUpperCase()}`)
  res.setHeader('Content-Disposition', `attachment; filename="conversation.${extension}"; filename*=UTF-8''${encoded}`)
}

async function handle(req: IncomingMessage, res: ServerResponse) {
  res.setHeader('Cache-Control', 'no-store')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Vary', 'Origin')
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
    if (!res.headersSent) send(res, 504, JSON.stringify({ error: 'request_timeout' }), 'application/json')
    else if (!res.writableFinished) res.destroy()
  }, 60_000)
  res.on('close', () => { if (!res.writableFinished) controller.abort() })
  try {
    const path = (req.url ?? '/').split('?', 1)[0]
    const methods = routes.get(path)
    if (!methods) throw new ApiError(404, 'not_found')
    if (!methods.split(', ').includes(req.method ?? '')) {
      res.setHeader('Allow', methods)
      throw new ApiError(405, 'method_not_allowed')
    }
    const origin = req.headers.origin
    if (origin !== undefined && !origins.has(origin)) throw new ApiError(403, 'origin_not_allowed')
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin)
      res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition, Retry-After')
    }
    if (path === '/api/chatgpt-share/health') {
      send(res, 200, req.method === 'HEAD' ? '' : '{"status":"ok"}', 'application/json')
      return
    }
    if (req.method === 'OPTIONS') {
      if (!origin || req.headers['access-control-request-method'] !== 'POST' ||
        req.headers['access-control-request-headers']?.split(',').some(header => header.trim().toLowerCase() !== 'content-type')) {
        throw new ApiError(403, 'origin_not_allowed')
      }
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
      res.setHeader('Access-Control-Max-Age', '600')
      res.writeHead(204).end()
      return
    }
    const conversion = path === '/api/webvpn/convert'
    rateLimit(`${req.headers['x-real-ip'] ?? req.socket.remoteAddress}:${conversion ? 'convert' : 'export'}`, conversion ? 60 : 6)
    const body = await readBody(req)
    if (conversion) {
      if ((body.direction !== 'encode' && body.direction !== 'decode') || typeof body.url !== 'string' ||
        Object.keys(body).some(key => !['direction', 'url'].includes(key))) throw new ApiError(400, 'invalid_request')
      let output: string
      try { output = convertWebvpnUrl(body.direction, body.url) } catch { throw new ApiError(400, 'invalid_url') }
      send(res, 200, JSON.stringify({ direction: body.direction, input: body.url, output }), 'application/json')
      return
    }
    const rawFetch = path === '/api/chatgpt-share/fetch'
    const { sourceUrl } = sourceFrom(body, rawFetch)
    if (!rawFetch && body.format !== 'markdown' && body.format !== 'zip') throw new ApiError(400, 'invalid_request')
    if (activeExports >= 2) throw new ApiError(503, 'busy')
    activeExports += 1
    try {
      let html: Buffer
      try {
        html = await downloadPublic(new URL(sourceUrl), {
          maxBytes: 12 * 1024 * 1024,
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
          allow: url => url.href === sourceUrl,
          html: true,
        })
      } catch { throw new ApiError(controller.signal.aborted ? 504 : 502, controller.signal.aborted ? 'request_timeout' : 'upstream_unavailable') }
      if (rawFetch) { send(res, 200, html, 'text/html; charset=utf-8'); return }
      let conversation
      try { conversation = parseSharedConversation(html.toString('utf8'), sourceUrl) }
      catch { throw new ApiError(422, 'unreadable_conversation') }
      if (body.format === 'markdown') {
        downloadName(res, conversation.title, 'md')
        send(res, 200, markdownFor(conversation), 'text/markdown; charset=utf-8')
      } else {
        const { bytes } = await bundleConversation(conversation, (attachment, maxBytes) => downloadPublic(new URL(attachment.url!), {
          maxBytes,
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
          allow: isAttachmentUrl,
          redirects: 2,
        }))
        if (controller.signal.aborted) throw new ApiError(504, 'request_timeout')
        downloadName(res, conversation.title, 'zip')
        send(res, 200, bytes, 'application/zip')
      }
    } finally {
      // Keep the slot while a slow client still holds the in-memory download.
      if (res.writableEnded && !res.writableFinished && !res.destroyed) {
        await new Promise<void>(resolve => {
          res.once('finish', resolve)
          res.once('close', resolve)
        })
      }
      activeExports -= 1
    }
  } catch (error) {
    if (!res.headersSent) {
      const failure = error instanceof ApiError ? error : new ApiError(500, 'internal_error')
      if (failure.status === 413) res.setHeader('Connection', 'close')
      if (failure.status === 429 || failure.status === 503) res.setHeader('Retry-After', '60')
      send(res, failure.status, JSON.stringify({ error: failure.code }), 'application/json')
    }
  } finally { clearTimeout(timer) }
}

const server = createServer({ maxHeaderSize: 8192, requestTimeout: 10_000, headersTimeout: 10_000 }, (req, res) => {
  void handle(req, res)
})
server.maxConnections = 64
server.maxRequestsPerSocket = 100
server.listen(Number(process.env.PORT ?? 8765), '127.0.0.1')
