export type ShareAttachment = {
  id: string
  name: string
  mimeType?: string
  url?: string
  messageIndex: number
  kind: 'uploaded' | 'generated'
  availability: 'direct' | 'public-share-unavailable' | 'chatgpt-session-required'
}

export type SharedMessage = {
  role: 'user' | 'assistant'
  text: string
  attachments: ShareAttachment[]
}

export type SharedConversation = {
  title: string
  sourceUrl: string
  messages: SharedMessage[]
  attachments: ShareAttachment[]
}

type UnknownRecord = Record<string, unknown>

const SHARE_ID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function cleanText(text: string): string {
  return text
    .replace(/\ue200cite.*?\ue201/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function safeAttachmentUrl(value: unknown): string | undefined {
  const url = asString(value)
  if (!url) return undefined

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' ? parsed.href : undefined
  } catch {
    return undefined
  }
}

function attachmentFrom(value: unknown, messageIndex: number, fallbackIndex: number): ShareAttachment | undefined {
  if (!isRecord(value)) return undefined

  const name =
    asString(value.name) ??
    asString(value.filename) ??
    asString(value.file_name) ??
    asString(value.display_name)
  if (!name) return undefined

  return {
    id: asString(value.id) ?? asString(value.file_id) ?? `${messageIndex}-${fallbackIndex}-${name}`,
    name,
    mimeType: asString(value.mime_type) ?? asString(value.content_type),
    url: safeAttachmentUrl(value.download_url) ?? safeAttachmentUrl(value.url),
    messageIndex,
    kind: 'uploaded',
    availability: safeAttachmentUrl(value.download_url) ?? safeAttachmentUrl(value.url)
      ? 'direct'
      : 'public-share-unavailable',
  }
}

function generatedArtifactsFor(text: string, messageIndex: number): ShareAttachment[] {
  const artifacts: ShareAttachment[] = []
  const pattern = /\[([^\]]+)\]\(sandbox:(\/mnt\/data\/[^)\s]+)(?:\s+[^)]*)?\)/g
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text))) {
    const name = match[1].trim()
    const path = match[2]
    if (!name || artifacts.some(artifact => artifact.id === path)) continue
    artifacts.push({
      id: path,
      name,
      messageIndex,
      kind: 'generated',
      availability: 'chatgpt-session-required',
    })
  }

  return artifacts
}

function attachmentsFor(message: UnknownRecord, messageIndex: number): ShareAttachment[] {
  const content = isRecord(message.content) ? message.content : {}
  const metadata = isRecord(message.metadata) ? message.metadata : {}
  const containers = [
    content.attachments,
    content.files,
    metadata.attachments,
    metadata.files,
  ]
  const attachments: ShareAttachment[] = []

  for (const container of containers) {
    const values = Array.isArray(container) ? container : isRecord(container) ? Object.values(container) : []
    for (const value of values) {
      const attachment = attachmentFrom(value, messageIndex, attachments.length)
      if (attachment && !attachments.some(existing => existing.id === attachment.id)) {
        attachments.push(attachment)
      }
    }
  }

  return attachments
}

function unpackPool(pool: unknown[]): UnknownRecord {
  const cache = new Map<number, unknown>()

  const materialize = (index: number): unknown => {
    if (cache.has(index)) return cache.get(index)
    if (index < 0 || index >= pool.length) return index
    cache.set(index, `<reference:${index}>`)
    const result = resolve(pool[index])
    cache.set(index, result)
    return result
  }

  const resolve = (value: unknown): unknown => {
    if (value === null || typeof value === 'boolean' || typeof value === 'number' && !Number.isInteger(value) || typeof value === 'string') {
      return value
    }
    if (typeof value === 'number') {
      return value === -5 ? null : materialize(value)
    }
    if (Array.isArray(value)) return value.map(resolve)
    if (isRecord(value)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, child]) => {
          const resolvedKey = key.startsWith('_') && /^_\d+$/.test(key)
            ? String(resolve(Number(key.slice(1))))
            : key
          return [resolvedKey, resolve(child)]
        }),
      )
    }
    return value
  }

  const root = materialize(0)
  if (!isRecord(root)) throw new Error('The shared page has an unexpected payload.')
  return root
}

function decodePayload(html: string): UnknownRecord {
  const match = html.match(
    /window\.__reactRouterContext\.streamController\.enqueue\(((?:"(?:\\.|[^"\\])*")|(?:'(?:\\.|[^'\\])*'))\)/,
  )
  if (!match) throw new Error('Could not find a ChatGPT share payload in this HTML file.')

  const encoded = JSON.parse(match[1]) as string
  const pool = JSON.parse(encoded)
  if (!Array.isArray(pool)) throw new Error('The shared page payload is not in the expected format.')
  return unpackPool(pool)
}

function conversationData(root: UnknownRecord): UnknownRecord {
  const loaderData = root.loaderData
  if (!isRecord(loaderData)) throw new Error('The shared page has no conversation data.')
  const routeKey = Object.keys(loaderData).find(key => key.startsWith('routes/share.'))
  const route = routeKey ? loaderData[routeKey] : undefined
  if (!isRecord(route) || !isRecord(route.serverResponse) || !isRecord(route.serverResponse.data)) {
    throw new Error('The shared page has no readable conversation data.')
  }
  return route.serverResponse.data
}

export function parseShareUrl(input: string): { shareId: string; sourceUrl: string } {
  let parsed: URL
  try {
    parsed = new URL(input.trim())
  } catch {
    throw new Error('Enter a complete ChatGPT shared-link URL.')
  }

  const shareId = parsed.pathname.match(/^\/share\/([^/]+)\/?$/)?.[1]
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'chatgpt.com' || !shareId || !SHARE_ID_PATTERN.test(shareId)) {
    throw new Error('Use a public URL beginning with https://chatgpt.com/share/.')
  }
  return { shareId, sourceUrl: `https://chatgpt.com/share/${shareId}` }
}

export function parseSharedConversation(html: string, sourceUrl: string): SharedConversation {
  const data = conversationData(decodePayload(html))
  const title = asString(data.title) ?? 'ChatGPT export'
  const nodes = data.linear_conversation
  if (!Array.isArray(nodes)) throw new Error('The shared page has no linear conversation.')

  const messages: SharedMessage[] = []
  for (let index = 0; index < nodes.length; index += 1) {
    const node = nodes[index]
    if (!isRecord(node) || !isRecord(node.message)) continue
    const message = node.message
    const author = isRecord(message.author) ? message.author : {}
    const content = isRecord(message.content) ? message.content : {}
    const role = author.role
    // Uploaded files and images are represented as `multimodal_text` messages.
    // Their filename and MIME type live in message.metadata.attachments, while
    // the original file may remain inaccessible from the public share.
    if ((role !== 'user' && role !== 'assistant') || (content.content_type !== 'text' && content.content_type !== 'multimodal_text') || !Array.isArray(content.parts)) {
      continue
    }
    const text = cleanText(content.parts.filter((part): part is string => typeof part === 'string').join('\n'))
    const attachments = [
      ...attachmentsFor(message, index),
      ...(role === 'assistant' ? generatedArtifactsFor(text, index) : []),
    ]
    if (text || attachments.length > 0) messages.push({ role, text, attachments })
  }

  if (messages.length === 0) throw new Error('No visible user or assistant messages were found.')
  return {
    title,
    sourceUrl,
    messages,
    attachments: messages.flatMap(message => message.attachments),
  }
}

export function markdownFor(conversation: SharedConversation): string {
  const source = conversation.sourceUrl.startsWith('https://')
    ? `> Source: [shared ChatGPT conversation](${conversation.sourceUrl})`
    : `> Source: ${conversation.sourceUrl}`
  const lines = [
    `# ${conversation.title}`,
    '',
    source,
    '>',
    '> Exported in your browser. Tool internals and hidden reasoning are omitted.',
    '',
  ]
  for (const message of conversation.messages) {
    lines.push(`## ${message.role === 'user' ? 'User' : 'Assistant'}`, '')
    if (message.text) lines.push(message.text, '')
    if (message.attachments.length > 0) {
      lines.push('### Attachments', '')
      for (const attachment of message.attachments) {
        const type = attachment.mimeType ? ` (${attachment.mimeType})` : ''
        const availability = attachment.availability === 'direct'
          ? ' — included in the ZIP when the browser can retrieve it.'
          : attachment.availability === 'chatgpt-session-required'
            ? ' — not bundled; downloading it requires an active ChatGPT browser session.'
            : ' — not included; the public share does not expose the original file.'
        lines.push(`- ${attachment.name}${type}${availability}`)
      }
      lines.push('')
    }
  }
  return `${lines.join('\n').trim()}\n`
}

export async function fetchSharedHtml(shareId: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch('/api/chatgpt-share/fetch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ shareId }),
    signal,
  })
  if (!response.ok) {
    throw new Error('The proxy could not fetch this share. It may be unavailable, rate-limited, or blocked upstream.')
  }
  return response.text()
}
