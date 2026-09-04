import { useEffect, useMemo, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Button, Card, InputField } from '../components/Primitives'
import type { AppOutletContext } from '../components/AppShell'
import { decryptUrl, encryptUrl, isLikelyNavigableUrl, parseConversionResult } from '../lib/webvpn'

type Mode = 'encrypt' | 'decrypt'
type CopyState = 'idle' | 'copied' | 'failed'

type ClipboardDocument = Document & {
  execCommand?: (command: string) => boolean
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'absolute'
  textarea.style.opacity = '0'
  document.body.append(textarea)
  textarea.select()

  const didCopy = (document as ClipboardDocument).execCommand?.('copy') ?? false
  textarea.remove()

  if (!didCopy) {
    throw new Error('Copy failed')
  }
}

export function UestcVpnPage() {
  const { copy } = useOutletContext<AppOutletContext>()
  const [mode, setMode] = useState<Mode>('encrypt')
  const [input, setInput] = useState('')
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [swapTick, setSwapTick] = useState(0)

  const { text: output, isError } = useMemo(() => {
    if (!input.trim()) return { text: '', isError: false }
    const raw = mode === 'encrypt' ? encryptUrl(input) : decryptUrl(input)
    return parseConversionResult(raw)
  }, [input, mode])

  useEffect(() => {
    setCopyState('idle')
  }, [mode, input])

  useEffect(() => {
    if (copyState === 'idle') {
      return
    }

    const timer = window.setTimeout(() => setCopyState('idle'), 1400)
    return () => window.clearTimeout(timer)
  }, [copyState])

  const canJump = useMemo(() => !isError && isLikelyNavigableUrl(output), [isError, output])
  const copyLabel =
    copyState === 'copied'
      ? copy.tool.copied
      : copyState === 'failed'
        ? copy.tool.copyFailed
        : copy.tool.copy

  function handleSwap() {
    setSwapTick(t => t + 1)
    setMode(m => (m === 'encrypt' ? 'decrypt' : 'encrypt'))
  }

  async function handleCopyAsync() {
    if (!output) {
      return
    }

    try {
      await copyText(output)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
  }

  function handleJump() {
    if (!canJump) {
      return
    }

    window.open(output, '_blank', 'noopener,noreferrer')
  }

  const inputLabel = mode === 'encrypt' ? copy.tool.inputLabelEncrypt : copy.tool.inputLabelDecrypt
  const outputLabel =
    mode === 'encrypt' ? copy.tool.outputLabelEncrypt : copy.tool.outputLabelDecrypt

  return (
    <section className="page page--tool">
      <div className="home-hero tool-hero">
        <h1 className="home-hero__title">{copy.tool.title}</h1>
        <p className="home-hero__subtitle">{copy.tool.description}</p>
      </div>
      <Card className="tool-surface">
        <div className="url-pair">
          <InputField
            label={inputLabel}
            placeholder={
              mode === 'encrypt' ? copy.tool.encryptPlaceholder : copy.tool.decryptPlaceholder
            }
            value={input}
            autoFocus
            onChange={event => setInput(event.target.value)}
          />

          <button
            type="button"
            className="swap-btn"
            aria-label={copy.tool.swapAriaLabel}
            onClick={handleSwap}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{
                transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: `rotate(${swapTick * 180}deg)`,
              }}
            >
              <path d="m17 1 4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="m7 23-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </button>

          <InputField
            label={outputLabel}
            value={output}
            placeholder={copy.tool.outputPlaceholder}
            className={isError ? 'url-input--error' : undefined}
            readOnly
            trailingButton={
              output && !isError ? (
                <button
                  type="button"
                  className={`url-field__copy-btn${copyState === 'copied' ? ' url-field__copy-btn--copied' : ''}`}
                  aria-label={copy.tool.copy}
                  onClick={() => void handleCopyAsync()}
                >
                  {copyState === 'copied' ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
                  )}
                </button>
              ) : undefined
            }
          />
        </div>

        <div className="tool-actions">
          <Button
            type="button"
            variant={copyState === 'copied' ? 'success' : 'secondary'}
            disabled={!output || isError}
            onClick={() => void handleCopyAsync()}
          >
            {copyState === 'copied' ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /></svg>
            )}
            {copyLabel}
          </Button>
          <Button type="button" disabled={!canJump} onClick={handleJump}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>
            {copy.tool.jumpTo}
          </Button>
        </div>

        {isError && output ? (
          <p className="status-msg status-msg--error">{copy.tool.convertFailed}</p>
        ) : !canJump && output ? (
          <p className="status-msg status-msg--error">{copy.tool.jumpUnavailable}</p>
        ) : null}
      </Card>
      <p className="tool-notice">{copy.tool.notice}</p>
    </section>
  )
}
