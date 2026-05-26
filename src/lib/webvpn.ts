import CryptoJS from 'crypto-js'

const VPN_HOST = 'https://webvpn.uestc.edu.cn'
const DEFAULT_KEY = 'wrdvpnisthebest!'
const DEFAULT_IV = 'wrdvpnisthebest!'
const PROTOCOLS = ['http', 'https', 'ssh', 'vnc', 'telnet', 'rdp'] as const
const NAVIGABLE_PROTOCOLS = new Set(PROTOCOLS.map((protocol) => `${protocol}:`))
const DECRYPT_FAILED_SEPARATOR = '__WEBVPN_CONVERTER_DEPCRYPT@RESULT'

type ExtractedUrl = {
  url: string
  host: string
  path: string
  port: string
  protocol: string
}

type PadMode = 'utf8' | 'hex'

function textRightAppend(text: string, mode: PadMode): string {
  const segmentByteSize = mode === 'utf8' ? 16 : 32
  const appendLength = segmentByteSize - (text.length % segmentByteSize)
  return text + '0'.repeat(appendLength)
}

function createCipherOptions(iv: string) {
  return {
    iv: CryptoJS.enc.Utf8.parse(iv),
    mode: CryptoJS.mode.CFB,
    padding: CryptoJS.pad.NoPadding,
    segmentSize: 128,
  }
}

function wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
  const { words, sigBytes } = wordArray
  const bytes = new Uint8Array(sigBytes)

  for (let index = 0; index < sigBytes; index += 1) {
    bytes[index] = (words[index >>> 2] >>> (24 - (index % 4) * 8)) & 0xff
  }

  return bytes
}

function encryptHost(
  text: string,
  key: string = DEFAULT_KEY,
  iv: string = DEFAULT_IV,
): string {
  const encrypted = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(textRightAppend(text, 'utf8')),
    CryptoJS.enc.Utf8.parse(key),
    createCipherOptions(iv),
  )
  const encryptedHex = encrypted.ciphertext.toString(CryptoJS.enc.Hex)

  return (
    CryptoJS.enc.Utf8.parse(iv).toString(CryptoJS.enc.Hex) +
    encryptedHex.slice(0, text.length * 2)
  )
}

function decryptText(
  text: string,
  key: string = DEFAULT_KEY,
  iv: string = DEFAULT_IV,
): string {
  const ciphertext = CryptoJS.enc.Hex.parse(
    textRightAppend(text.slice(iv.length * 2), 'hex'),
  )
  const decrypted = CryptoJS.AES.decrypt(
    CryptoJS.lib.CipherParams.create({ ciphertext }),
    CryptoJS.enc.Utf8.parse(key),
    createCipherOptions(iv),
  )
  const decoded = new TextDecoder().decode(wordArrayToUint8Array(decrypted))
  const textLength = (text.length - iv.length * 2) / 2

  return decoded.slice(0, textLength)
}

function extractUrlLegacy(requiredUrl: string): ExtractedUrl {
  const url = requiredUrl.trim()
  let protocol = 'http'
  let path = ''
  let port = ''
  let urlString = url

  for (const candidate of PROTOCOLS) {
    const prefix = `${candidate}://`
    if (urlString.slice(0, prefix.length).toLowerCase() === prefix) {
      protocol = candidate
      urlString = urlString.slice(prefix.length)
    }
  }

  const segments = urlString.split('?')[0].split(':')
  if (segments.length > 1) {
    port = segments[1].split('/')[0]
    urlString =
      urlString.slice(0, segments[0].length) +
      urlString.slice(segments[0].length + port.length + 1)
  }

  const pathStart = urlString.indexOf('/')
  let host = urlString
  if (pathStart !== -1) {
    host = urlString.slice(0, pathStart)
    path = urlString.slice(pathStart)
  }

  return { url, host, path, port, protocol }
}

export function encryptUrl(url: string): string {
  const extracted = extractUrlLegacy(url)
  const encryptedHost = encryptHost(extracted.host)

  if (extracted.port) {
    return `${VPN_HOST}/${extracted.protocol}-${extracted.port}/${encryptedHost}${extracted.path}`
  }

  return `${VPN_HOST}/${extracted.protocol}/${encryptedHost}${extracted.path}`
}

export function decryptUrl(url: string): string {
  let result = ''

  try {
    if (!url) {
      throw new Error('URL is required!')
    }

    const extracted = extractUrlLegacy(url)
    const segments = extracted.path.split('/')
    let protocol = 'http'
    let port = ''
    let host = ''

    if (segments.length > 1) {
      const protocolParts = segments[1].split('-')
      protocol = protocolParts[0]
      port = protocolParts[1] ?? ''
      host = segments[2] ?? ''
    }

    const decryptedHost = decryptText(host)
    const remainingSegments = segments.slice(3).join('/')
    result = `${protocol}://${decryptedHost}${port ? `:${port}` : ''}/${remainingSegments}`

    if (!decryptedHost || !host) {
      throw new Error(
        'Decrypted host is empty, decryption might be failed! Check if your url, key, iv is correct.',
      )
    }

    const parsed = new URL(result)
    if (!parsed.protocol || !parsed.hostname) {
      throw new Error(`Decrypted URL is invalid: ${result}`)
    }

    return result
  } catch (error) {
    let errorString = error instanceof Error ? error.message : String(error)
    if (errorString.includes(DECRYPT_FAILED_SEPARATOR)) {
      ;[errorString] = errorString.split(DECRYPT_FAILED_SEPARATOR, 1)
    }
    return `Decryption failed: ${errorString}${DECRYPT_FAILED_SEPARATOR}${result}`
  }
}

export type ConversionResult = { text: string; isError: boolean }

export function parseConversionResult(raw: string): ConversionResult {
  const sepIdx = raw.indexOf(DECRYPT_FAILED_SEPARATOR)
  if (sepIdx !== -1) {
    return { text: raw.slice(0, sepIdx), isError: true }
  }
  return { text: raw, isError: false }
}

export function isLikelyNavigableUrl(url: string): boolean {
  if (!url.trim()) {
    return false
  }

  try {
    const parsed = new URL(url)
    return NAVIGABLE_PROTOCOLS.has(parsed.protocol) && Boolean(parsed.hostname)
  } catch {
    return false
  }
}
