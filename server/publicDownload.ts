import { lookup } from 'node:dns/promises'
import { request as httpRequest, type ClientRequestArgs } from 'node:http'
import { Agent, get } from 'node:https'
import { connect as tlsConnect } from 'node:tls'
import { BlockList } from 'node:net'
import { addAbortListener } from 'node:events'
import type { Duplex } from 'node:stream'

const blocked = new BlockList()
for (const [network, prefix] of [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3],
] as const) blocked.addSubnet(network, prefix, 'ipv4')
const globalV6 = new BlockList()
globalV6.addSubnet('2000::', 3, 'ipv6')
for (const [network, prefix] of [['2001::', 23], ['2001:db8::', 32], ['2002::', 16], ['3fff::', 20]] as const) {
  blocked.addSubnet(network, prefix, 'ipv6')
}

export function isPublicAddress(address: string, family: number): boolean {
  return family === 4 ? !blocked.check(address, 'ipv4')
    : family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6')
}

export function isAttachmentUrl(url: URL): boolean {
  return url.protocol === 'https:' && !url.port && !url.username && !url.password && (
    url.hostname === 'oaiusercontent.com' || url.hostname.endsWith('.oaiusercontent.com') ||
    url.hostname === 'oaidalleapiprodscus.blob.core.windows.net'
  )
}

/** HTTPS proxy from the standard environment variables, unless NO_PROXY excludes the host. */
function proxyFor(url: URL): URL | undefined {
  const value = (process.env.https_proxy || process.env.HTTPS_PROXY || '').trim()
  if (!value) return undefined
  const host = url.hostname.toLowerCase()
  const bypass = (process.env.no_proxy || process.env.NO_PROXY || '')
    .split(',').map(entry => entry.trim().toLowerCase().replace(/^\*?\./, '')).filter(Boolean)
  if (bypass.some(entry => entry === '*' || host === entry || host.endsWith(`.${entry}`))) return undefined
  const proxy = new URL(value)
  if (proxy.protocol !== 'http:') throw new Error('proxy_unsupported')
  return proxy
}

/** Tunnels TLS through an HTTP proxy with CONNECT. The proxy, not this process, resolves the host. */
class ProxyAgent extends Agent {
  private readonly proxy: URL
  private readonly abortSignal: AbortSignal

  constructor(proxy: URL, signal: AbortSignal) {
    super()
    this.proxy = proxy
    this.abortSignal = signal
  }

  override createConnection(options: ClientRequestArgs, callback?: (error: Error | null, stream: Duplex) => void): undefined {
    const hostname = options.hostname ?? options.host ?? ''
    const port = Number(options.port) || 443
    const fail = (error: Error) => callback?.(error, undefined as never)
    const headers: Record<string, string> = { Host: `${hostname}:${port}` }
    if (this.proxy.username) {
      const credentials = `${decodeURIComponent(this.proxy.username)}:${decodeURIComponent(this.proxy.password)}`
      headers['Proxy-Authorization'] = `Basic ${Buffer.from(credentials).toString('base64')}`
    }
    const connect = httpRequest({
      host: this.proxy.hostname,
      port: this.proxy.port || 80,
      method: 'CONNECT',
      path: `${hostname}:${port}`,
      headers,
      signal: this.abortSignal,
    })
    connect.on('connect', (response, socket) => {
      if (response.statusCode !== 200) {
        socket.destroy()
        fail(new Error('upstream_unavailable'))
        return
      }
      callback?.(null, tlsConnect({ socket, servername: hostname }))
    })
    connect.on('error', fail)
    connect.end()
    return undefined
  }
}

type DownloadOptions = {
  maxBytes: number
  signal: AbortSignal
  allow: (url: URL) => boolean
  redirects?: number
  html?: boolean
}

/** Validate DNS and pin the selected address to the TLS socket, including redirects. */
export async function downloadPublic(url: URL, options: DownloadOptions): Promise<Buffer> {
  if (!options.allow(url)) throw new Error('download_policy')
  options.signal.throwIfAborted()
  const proxy = proxyFor(url)
  // Through a proxy the proxy resolves the host, so local DNS validation and address
  // pinning cannot apply; the hostname allowlist above is the only gate in that mode.
  let address: { address: string; family: number } | undefined
  if (!proxy) {
    const addresses = await new Promise<{ address: string; family: number }[]>((resolve, reject) => {
      const subscription = addAbortListener(options.signal, () => reject(new Error('upstream_timeout')))
      void lookup(url.hostname, { all: true, verbatim: true }).then(resolve, reject).finally(() => subscription[Symbol.dispose]())
    })
    options.signal.throwIfAborted()
    if (!addresses.length || addresses.some(record => !isPublicAddress(record.address, record.family))) {
      throw new Error('download_policy')
    }
    address = addresses.find(record => record.family === 4) ?? addresses[0]
  }
  return new Promise<Buffer>((resolve, reject) => {
    const request = get(url, {
      agent: proxy ? new ProxyAgent(proxy, options.signal) : false,
      // ChatGPT's security headers can exceed Node's 16 KiB default.
      maxHeaderSize: 64 * 1024,
      ...(address && {
        family: address.family,
        lookup: (_hostname: string, _options: unknown, callback: (error: Error | null, address: string, family: number) => void) => callback(null, address.address, address.family),
      }),
      signal: options.signal,
      headers: {
        // ChatGPT serves a content-less link-preview page to non-browser user agents.
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
        Accept: options.html ? 'text/html,application/xhtml+xml' : '*/*',
        'Accept-Encoding': 'identity',
        'Accept-Language': 'en-US,en;q=0.8',
      },
    }, response => {
      const status = response.statusCode ?? 0
      if ([301, 302, 303, 307, 308].includes(status)) {
        response.destroy()
        if (!options.redirects || !response.headers.location) {
          reject(new Error('upstream_redirect'))
          return
        }
        try {
          const next = new URL(response.headers.location, url)
          void downloadPublic(next, { ...options, redirects: options.redirects - 1 }).then(resolve, reject)
        } catch { reject(new Error('upstream_redirect')) }
        return
      }
      const length = response.headers['content-length']
      const contentType = response.headers['content-type']?.split(';', 1)[0].trim().toLowerCase()
      if (status !== 200 || length && (!/^\d+$/.test(length) || Number(length) > options.maxBytes) ||
        response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity' ||
        options.html && contentType !== 'text/html') {
        response.destroy()
        reject(new Error('upstream_unavailable'))
        return
      }
      const chunks: Buffer[] = []
      let size = 0
      response.on('data', (chunk: Buffer) => {
        size += chunk.byteLength
        if (size > options.maxBytes) response.destroy(new Error('upstream_too_large'))
        else chunks.push(chunk)
      })
      response.on('end', () => resolve(Buffer.concat(chunks, size)))
      response.on('error', reject)
    })
    request.on('error', reject)
    request.setTimeout(15_000, () => request.destroy(new Error('upstream_timeout')))
  })
}
