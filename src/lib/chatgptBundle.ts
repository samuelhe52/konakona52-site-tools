import { markdownFor, type SharedConversation, type ShareAttachment } from './chatgptShare'
import { createZip, safeFilename, type ZipEntry } from './downloads'

export const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024
export const MAX_TOTAL_ATTACHMENT_BYTES = 48 * 1024 * 1024
const MAX_ATTACHMENT_FILES = 16

export type RetrieveAttachment = (attachment: ShareAttachment, maxBytes: number) => Promise<Uint8Array | undefined>

/** The caller owns network policy; the shared builder owns ZIP layout and omissions. */
export async function bundleConversation(conversation: SharedConversation, retrieve: RetrieveAttachment) {
  const encoder = new TextEncoder()
  const entries: ZipEntry[] = [{ name: 'conversation.md', data: encoder.encode(markdownFor(conversation)) }]
  const attachments = []
  let totalBytes = 0
  let attemptedFiles = 0

  for (let index = 0; index < conversation.attachments.length; index += 1) {
    const attachment = conversation.attachments[index]
    let data: Uint8Array | undefined
    let reason: string | null = null
    if (attachment.availability === 'chatgpt-session-required') {
      reason = 'Requires an active ChatGPT browser session.'
    } else if (attachment.availability === 'public-share-unavailable' || !attachment.url) {
      reason = 'The public share does not expose the original file.'
    } else if (attemptedFiles >= MAX_ATTACHMENT_FILES || totalBytes >= MAX_TOTAL_ATTACHMENT_BYTES) {
      reason = 'The bundle reached its attachment count or size limit.'
    } else {
      attemptedFiles += 1
      const maxBytes = Math.min(MAX_ATTACHMENT_BYTES, MAX_TOTAL_ATTACHMENT_BYTES - totalBytes)
      try {
        data = await retrieve(attachment, maxBytes)
        if (data && data.byteLength > maxBytes) data = undefined
      } catch {
        // Network details can contain signed URLs. Do not put them in the manifest.
      }
      if (!data) reason = 'Public download failed, exceeded a limit, or was blocked by download policy.'
    }
    const basename = safeFilename(attachment.name)
    const filename = data ? `attachments/${String(index + 1).padStart(2, '0')}-${basename}` : null
    if (data && filename) {
      totalBytes += data.byteLength
      entries.push({ name: filename, data })
    }
    attachments.push({
      name: attachment.name,
      kind: attachment.kind,
      availability: attachment.availability,
      mimeType: attachment.mimeType ?? null,
      included: filename !== null,
      filename,
      reason,
    })
  }
  entries.push({
    name: 'attachment-manifest.json',
    data: encoder.encode(JSON.stringify({ source: conversation.sourceUrl, attachments }, null, 2)),
  })
  return { bytes: createZip(entries), omitted: attachments.filter(attachment => !attachment.included).length }
}
