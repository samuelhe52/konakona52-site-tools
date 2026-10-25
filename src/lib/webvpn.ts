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
  const decoded = new TextDecoder('utf-8', { fatal: true }).decode(wordArrayToUint8Array(decrypted).slice(0, (text.length - iv.length * 2) / 2))
  const textLength = (text.length - iv.length * 2) / 2

  return decoded.slice(0, textLength)
}

function extractUrl(requiredUrl: string): ExtractedUrl {
  const input = requiredUrl.trim()
  if (!input || /\s/.test(input) || input.includes('\\')) throw new Error('Enter a valid URL without whitespace or backslashes.')
  const url = /^[a-z][a-z0-9+.-]*:\/\//i.test(input) ? input : `http://${input}`
  const parsed = new URL(url)
  const protocol = parsed.protocol.slice(0, -1)
  if (!NAVIGABLE_PROTOCOLS.has(parsed.protocol) || !parsed.hostname || parsed.username || parsed.password) {
    throw new Error('Use an http, https, ssh, vnc, telnet, or rdp URL without credentials.')
  }
  if (parsed.hostname.length > 255) throw new Error('The URL host is too long.')
  const authority = url.slice(url.indexOf('://') + 3).split(/[/?#]/, 1)[0]
  const port = authority.match(/:(\d+)$/)?.[1] ?? ''
  if (port && (Number(port) < 1 || Number(port) > 65535)) throw new Error('Use a port between 1 and 65535.')
  return {
    url,
    host: parsed.hostname,
    path: `${parsed.pathname || '/'}${parsed.search}${parsed.hash}`,
    port,
    protocol,
  }
}

export function encryptUrl(url: string): string {
  const extracted = extractUrl(url)
  const encryptedHost = encryptHost(extracted.host)
  return `${VPN_HOST}/${extracted.protocol}${extracted.port ? `-${extracted.port}` : ''}/${encryptedHost}${extracted.path}`
}

function decodedUrl(url: string): string {
  const input = url.trim()
  if (!input || /\s/.test(input) || input.includes('\\')) throw new Error('Enter a valid UESTC WebVPN URL.')
  const parsed = new URL(input)
  if (parsed.origin !== VPN_HOST || parsed.username || parsed.password) throw new Error('Use https://webvpn.uestc.edu.cn/.')
  const match = parsed.pathname.match(/^\/(http|https|ssh|vnc|telnet|rdp)(?:-(\d{1,5}))?\/([a-f0-9]+)(\/.*)?$/i)
  if (!match) throw new Error('The WebVPN URL has an invalid protocol or encrypted host.')
  const [, protocol, port = '', host, path = '/'] = match
  const ivHex = CryptoJS.enc.Utf8.parse(DEFAULT_IV).toString(CryptoJS.enc.Hex)
  if (!host.toLowerCase().startsWith(ivHex) || host.length <= ivHex.length || host.length % 2 || host.length > ivHex.length + 510) {
    throw new Error('The WebVPN encrypted host is invalid.')
  }
  const decryptedHost = decryptText(host)
  const result = `${protocol.toLowerCase()}://${decryptedHost}${port ? `:${port}` : ''}${path}${parsed.search}${parsed.hash}`
  const extracted = extractUrl(result)
  if (extracted.host !== decryptedHost || /[/?#@]/.test(decryptedHost)) throw new Error('The decrypted host is invalid.')
  return result
}

export function decryptUrl(url: string): string {
  try {
    return decodedUrl(url)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid WebVPN URL.'
    return `Decryption failed: ${message}${DECRYPT_FAILED_SEPARATOR}`
  }
}

export function convertWebvpnUrl(direction: 'encode' | 'decode', url: string): string {
  return direction === 'encode' ? encryptUrl(url) : decodedUrl(url)
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
