import { useMemo, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../components/AppShell'
import { MarkdownPreview } from '../components/MarkdownPreview'
import { Button, Card, InputField } from '../components/Primitives'
import {
  fetchSharedHtml,
  markdownFor,
  parseSharedConversation,
  parseShareUrl,
  type ShareAttachment,
  type SharedConversation,
} from '../lib/chatgptShare'
import { createZip, downloadBlob, safeFilename, type ZipEntry } from '../lib/downloads'

type State = 'idle' | 'fetching' | 'ready' | 'error' | 'bundling'

const encoder = new TextEncoder()
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024

function attachmentFilename(index: number, attachment: ShareAttachment): string {
  const basename = attachment.name.replace(/[\\/:*?"<>|]/g, '-').replace(/^\.+/, '') || `attachment-${index + 1}`
  return `attachments/${String(index + 1).padStart(2, '0')}-${basename}`
}

function zipBlob(entries: ZipEntry[]): Blob {
  const bytes = createZip(entries)
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  return new Blob([copy.buffer], { type: 'application/zip' })
}

async function fetchAttachment(attachment: ShareAttachment): Promise<Uint8Array | undefined> {
  if (!attachment.url) return undefined
  try {
    const response = await fetch(attachment.url, { credentials: 'omit' })
    const length = Number(response.headers.get('content-length') ?? 0)
    if (!response.ok || (Number.isFinite(length) && length > MAX_ATTACHMENT_BYTES)) return undefined
    const data = new Uint8Array(await response.arrayBuffer())
    return data.length <= MAX_ATTACHMENT_BYTES ? data : undefined
  } catch {
    return undefined
  }
}

function omissionReason(attachment: ShareAttachment): string {
  if (attachment.availability === 'chatgpt-session-required') {
    return 'Requires a live ChatGPT browser session to resolve its temporary download URL.'
  }
  if (attachment.availability === 'public-share-unavailable') {
    return 'The public share did not expose the original uploaded file.'
  }
  return 'The browser could not retrieve the public file (it may be blocked, too large, or temporarily unavailable).'
}

export function ChatGptSharePage() {
  const { copy } = useOutletContext<AppOutletContext>()
  const [url, setUrl] = useState('')
  const [conversation, setConversation] = useState<SharedConversation>()
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  function loadHtml(html: string, sourceUrl: string) {
    const parsed = parseSharedConversation(html, sourceUrl)
    setConversation(parsed)
    setState('ready')
    setMessage('')
  }

  async function handleFetch() {
    try {
      const { shareId, sourceUrl } = parseShareUrl(url)
      setState('fetching')
      setMessage('')
      loadHtml(await fetchSharedHtml(shareId), sourceUrl)
    } catch (error) {
      setConversation(undefined)
      setState('error')
      setMessage(error instanceof Error ? error.message : copy.share.fetchFailed)
    }
  }

  async function handleImport(file: File | undefined) {
    if (!file) return
    try {
      setState('fetching')
      setMessage('')
      loadHtml(await file.text(), copy.share.importSource)
    } catch (error) {
      setConversation(undefined)
      setState('error')
      setMessage(error instanceof Error ? error.message : copy.share.importFailed)
    } finally {
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function downloadMarkdown() {
    if (!conversation) return
    downloadBlob(
      new Blob([markdownFor(conversation)], { type: 'text/markdown;charset=utf-8' }),
      `${safeFilename(conversation.title)}.md`,
    )
  }

  async function downloadBundle() {
    if (!conversation) return
    setState('bundling')
    setMessage('')
    try {
      const entries: ZipEntry[] = [{ name: 'conversation.md', data: encoder.encode(markdownFor(conversation)) }]
      const attachmentStatus = []
      for (let index = 0; index < conversation.attachments.length; index += 1) {
        const attachment = conversation.attachments[index]
        const data = await fetchAttachment(attachment)
        const filename = data ? attachmentFilename(index, attachment) : undefined
        if (data && filename) entries.push({ name: filename, data })
        attachmentStatus.push({
          name: attachment.name,
          kind: attachment.kind,
          availability: attachment.availability,
          mimeType: attachment.mimeType ?? null,
          included: Boolean(filename),
          filename: filename ?? null,
          reason: filename ? null : omissionReason(attachment),
        })
      }
      entries.push({
        name: 'attachment-manifest.json',
        data: encoder.encode(JSON.stringify({ source: conversation.sourceUrl, attachments: attachmentStatus }, null, 2)),
      })
      downloadBlob(zipBlob(entries), `${safeFilename(conversation.title)}.zip`)
      setState('ready')
      const omitted = attachmentStatus.filter(attachment => !attachment.included).length
      setMessage(omitted > 0 ? copy.share.bundlePartial.replace('{count}', String(omitted)) : copy.share.bundleReady)
    } catch {
      setState('ready')
      setMessage(copy.share.bundleFailed)
    }
  }

  const busy = state === 'fetching' || state === 'bundling'
  const markdown = useMemo(() => conversation ? markdownFor(conversation) : '', [conversation])
  const unavailableUploads = conversation?.attachments.filter(attachment => attachment.availability === 'public-share-unavailable') ?? []
  const sessionArtifacts = conversation?.attachments.filter(attachment => attachment.availability === 'chatgpt-session-required') ?? []

  return (
    <section className="page page--tool page--chatgpt-share">
      <div className="tool-page-back">
        <Link to="/" className="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          {copy.share.backToHome}
        </Link>
      </div>
      <div className="home-hero tool-hero">
        <h1 className="home-hero__title">{copy.share.title}</h1>
        <p className="home-hero__subtitle">{copy.share.description}</p>
      </div>
      <Card className="tool-surface share-surface">
        <div className="share-privacy" role="note">
          <svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="M9 12l2 2 4-4" /></svg>
          <p>{copy.share.privacy}</p>
        </div>
        <div className="share-fetch-row">
          <InputField
            label={copy.share.urlLabel}
            placeholder="https://chatgpt.com/share/..."
            value={url}
            autoFocus
            disabled={busy}
            onChange={event => setUrl(event.target.value)}
          />
          <Button type="button" variant="primary" disabled={!url.trim() || busy} onClick={() => void handleFetch()}>
            {state === 'fetching' ? copy.share.fetching : copy.share.fetch}
          </Button>
        </div>
        <div className="share-import">
          <span>{copy.share.or}</span>
          <input ref={fileInput} className="visually-hidden" type="file" accept="text/html,.html,.htm" onChange={event => void handleImport(event.target.files?.[0])} />
          <Button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>{copy.share.importHtml}</Button>
        </div>
        {message ? <p className={`status-msg${state === 'error' ? ' status-msg--error' : ''}`}>{message}</p> : null}
      </Card>

      {conversation ? (
        <>
          <Card className="tool-surface share-result">
            <div className="share-result__summary">
              <h2>{conversation.title}</h2>
              <p>{copy.share.summary.replace('{messages}', String(conversation.messages.length)).replace('{attachments}', String(conversation.attachments.length))}</p>
            </div>
            {unavailableUploads.length > 0 || sessionArtifacts.length > 0 ? (
              <div className="share-file-status" role="note" aria-label={copy.share.fileStatus}>
                <span className="share-file-status__label">{copy.share.filesLabel}</span>
                {unavailableUploads.length > 0 ? (
                  <span className="share-file-status__item share-file-status__item--unavailable">{copy.share.unavailableUploadsShort.replace('{count}', String(unavailableUploads.length))}</span>
                ) : null}
                {sessionArtifacts.length > 0 ? (
                  <span className="share-file-status__item share-file-status__item--session">{copy.share.sessionArtifactsShort.replace('{count}', String(sessionArtifacts.length))}</span>
                ) : null}
              </div>
            ) : null}
            <div className="tool-actions share-actions">
              <Button type="button" variant="primary" disabled={busy} onClick={downloadMarkdown}>{copy.share.downloadMarkdown}</Button>
              <Button type="button" disabled={busy} onClick={() => void downloadBundle()}>{state === 'bundling' ? copy.share.bundling : copy.share.downloadBundle}</Button>
            </div>
          </Card>
          <Card className="tool-surface share-preview-surface">
            <h2 className="share-preview__title">{copy.share.previewTitle}</h2>
            <MarkdownPreview className="share-preview">{markdown}</MarkdownPreview>
          </Card>
        </>
      ) : null}
      <p className="tool-notice">{copy.share.notice}</p>
    </section>
  )
}
