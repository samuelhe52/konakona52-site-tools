import { useMemo, useRef, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../components/AppShell'
import { MarkdownPreview } from '../components/MarkdownPreview'
import { Button, Card, InputField, ToolHeader } from '../components/Primitives'
import {
  fetchSharedHtml,
  markdownFor,
  parseSharedConversation,
  parseShareUrl,
  type ShareAttachment,
  type SharedConversation,
} from '../lib/chatgptShare'
import { downloadBlob, safeFilename } from '../lib/downloads'
import { bundleConversation, MAX_ATTACHMENT_BYTES } from '../lib/chatgptBundle'

type State = 'idle' | 'fetching' | 'ready' | 'error' | 'bundling'

async function fetchAttachment(attachment: ShareAttachment, maxBytes: number): Promise<Uint8Array | undefined> {
  if (!attachment.url) return undefined
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 15_000)
  try {
    const response = await fetch(attachment.url, { credentials: 'omit', signal: controller.signal })
    const limit = Math.min(MAX_ATTACHMENT_BYTES, maxBytes)
    if (!response.ok || Number(response.headers.get('content-length') ?? 0) > limit || !response.body) {
      await response.body?.cancel()
      return undefined
    }
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let size = 0
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > limit) {
        await reader.cancel()
        return undefined
      }
      chunks.push(value)
    }
    const bytes = new Uint8Array(size)
    let offset = 0
    for (const chunk of chunks) {
      bytes.set(chunk, offset)
      offset += chunk.byteLength
    }
    return bytes
  } catch {
    return undefined
  } finally {
    window.clearTimeout(timer)
  }
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
      const { bytes, omitted } = await bundleConversation(conversation, fetchAttachment)
      const buffer = new ArrayBuffer(bytes.byteLength)
      new Uint8Array(buffer).set(bytes)
      downloadBlob(new Blob([buffer], { type: 'application/zip' }), `${safeFilename(conversation.title)}.zip`)
      setState('ready')
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
      <ToolHeader index="01" path="/chatgpt-share" title={copy.share.title} description={copy.share.description} />
      <Card className="tool-surface share-surface">
        <div className="share-privacy" role="note">
          <p>{copy.share.privacy}</p>
        </div>
        <form
          className="share-fetch-row"
          onSubmit={(event) => {
            event.preventDefault()
            if (url.trim() && !busy) void handleFetch()
          }}
        >
          <InputField
            label={copy.share.urlLabel}
            placeholder="https://chatgpt.com/share/..."
            value={url}
            autoFocus
            disabled={busy}
            onChange={event => setUrl(event.target.value)}
          />
          <Button type="submit" variant="primary" disabled={!url.trim() || busy}>
            {state === 'fetching' ? copy.share.fetching : copy.share.fetch}
          </Button>
        </form>
        <div className="share-import">
          <span>{copy.share.or}</span>
          <input ref={fileInput} className="visually-hidden" type="file" accept="text/html,.html,.htm" onChange={event => void handleImport(event.target.files?.[0])} />
          <Button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>{copy.share.importHtml}</Button>
        </div>
        <div className="status-region" role="status" aria-live="polite">
          {message ? <p className={`status-msg${state === 'error' ? ' status-msg--error' : ''}`}>{message}</p> : null}
        </div>
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
