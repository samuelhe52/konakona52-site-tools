import { lookup } from 'node:dns/promises'
import { get } from 'node:https'
import { BlockList } from 'node:net'
import { addAbortListener } from 'node:events'

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
  const addresses = await new Promise<{ address: string; family: number }[]>((resolve, reject) => {
    const subscription = addAbortListener(options.signal, () => reject(new Error('upstream_timeout')))
    void lookup(url.hostname, { all: true, verbatim: true }).then(resolve, reject).finally(() => subscription[Symbol.dispose]())
  })
  options.signal.throwIfAborted()
  if (!addresses.length || addresses.some(record => !isPublicAddress(record.address, record.family))) {
    throw new Error('download_policy')
  }
  const address = addresses.find(record => record.family === 4) ?? addresses[0]
  return new Promise<Buffer>((resolve, reject) => {
    const request = get(url, {
      agent: false,
      family: address.family,
      lookup: (_hostname, _options, callback) => callback(null, address.address, address.family),
      signal: options.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KonaToolboxShareFetcher/2.0)',
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
