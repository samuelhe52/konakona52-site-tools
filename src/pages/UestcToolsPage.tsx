import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useOutletContext } from 'react-router-dom'
import { Button, Card, InputField } from '../components/Primitives'
import type { AppOutletContext } from '../components/AppShell'
import { decryptUrl, encryptUrl, isLikelyNavigableUrl, parseConversionResult } from '../lib/webvpn'

type Mode = 'encrypt' | 'decrypt'
type CopyState = 'idle' | 'loading' | 'copied' | 'failed'

type ClipboardDocument = Document & {
  execCommand?: (command: string) => boolean
}

const PDF_SCRIPT_PATH = '/scripts/uestc-download-embedded-pdf.js'
const CALENDAR_SCRIPT_PATH = '/scripts/uestc-course2ics.js'

function isMondayDate(value: string): boolean {
  if (!value) {
    return true
  }

  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) {
    return false
  }

  const [, year, month, day] = match.map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year
    && date.getMonth() === month - 1
    && date.getDate() === day
    && date.getDay() === 1
}

function configureCalendarScript(source: string, startDate: string): string {
  if (!startDate) {
    return source
  }

  const invocation = `genics("${startDate.replaceAll('-', '')}");`
  const configured = source.replace(/genics\(\);\s*$/, `${invocation}\n`)
  if (configured === source) {
    throw new Error('Calendar script invocation was not found')
  }
  return configured
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

type ScriptSectionProps = {
  number: string
  title: string
  description: string
  steps: readonly string[]
  consoleStep: string
  consoleInstructions: readonly [string, string]
  scriptPath: string
  configuration?: ReactNode
  copyDisabled?: boolean
  copyResetKey?: string
  transformScript?: (source: string) => string
  attribution?: string
  attributionLinks?: {
    forkLabel: string
    sourceLabel: string
    licenseLabel: string
  }
  labels: {
    copy: string
    copying: string
    copied: string
    failed: string
    view: string
  }
}

function CopyIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

function ScriptSection({
  number,
  title,
  description,
  steps,
  consoleStep,
  consoleInstructions,
  scriptPath,
  configuration,
  copyDisabled = false,
  copyResetKey,
  transformScript,
  attribution,
  attributionLinks,
  labels,
}: ScriptSectionProps) {
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const copyPending = useRef(false)
  const loadingTimer = useRef<number | undefined>(undefined)
  const resetTimer = useRef<number | undefined>(undefined)

  useEffect(() => () => {
    window.clearTimeout(loadingTimer.current)
    window.clearTimeout(resetTimer.current)
  }, [])

  useEffect(() => {
    window.clearTimeout(resetTimer.current)
    setCopyState('idle')
  }, [copyResetKey])

  async function handleCopyAsync() {
    if (copyDisabled || copyPending.current) return
    copyPending.current = true
    window.clearTimeout(resetTimer.current)
    // Fast copies go straight to confirmation without flashing a loading label.
    loadingTimer.current = window.setTimeout(() => setCopyState('loading'), 200)
    try {
      const response = await fetch(scriptPath)
      if (!response.ok) {
        throw new Error(`Script request failed: HTTP ${response.status}`)
      }
      const source = await response.text()
      await copyText(transformScript ? transformScript(source) : source)
      setCopyState('copied')
      resetTimer.current = window.setTimeout(() => setCopyState('idle'), 1800)
    } catch {
      setCopyState('failed')
    } finally {
      window.clearTimeout(loadingTimer.current)
      copyPending.current = false
    }
  }

  const copyLabel = copyState === 'loading'
    ? labels.copying
    : copyState === 'copied'
      ? labels.copied
      : labels.copy

  return (
    <Card className="tool-surface uestc-section">
      <div className="uestc-section__heading">
        <span className="uestc-section__number" aria-hidden="true">{number}</span>
        <div>
          <h2 className="uestc-section__title">{title}</h2>
          <p className="uestc-section__description">{description}</p>
        </div>
      </div>

      <div className={`uestc-script-body${configuration ? ' uestc-script-body--configured' : ''}`}>
        <ol className="uestc-steps">
          <li>{steps[0]}</li>
          <li>
            {consoleStep}
            <ul>
              {consoleInstructions.map((instruction) => <li key={instruction}>{instruction}</li>)}
            </ul>
          </li>
          {steps.slice(1).map((step) => <li key={step}>{step}</li>)}
        </ol>
        <div className="uestc-script-controls">
          {configuration}

          <div className="uestc-script-actions">
            <Button
              className="uestc-script-copy-button"
              type="button"
              variant="primary"
              aria-disabled={copyDisabled || copyState === 'loading'}
              aria-busy={copyState === 'loading'}
              onClick={() => void handleCopyAsync()}
            >
              <span className="uestc-script-copy-content">
                <span className="uestc-script-copy-content__visible" key={copyLabel}>
                  {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
                  {copyLabel}
                </span>
                {[labels.copy, labels.copying, labels.copied].map((label, index) => (
                  <span className="uestc-script-copy-content__measure" aria-hidden="true" key={index}>
                    <CopyIcon />{label}
                  </span>
                ))}
              </span>
            </Button>
            <a className="uestc-script-link" href={scriptPath} target="_blank" rel="noopener noreferrer">
              {labels.view}
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 3h6v6" />
                <path d="M10 14 21 3" />
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              </svg>
            </a>
          </div>

          {copyState === 'failed' ? (
            <p className="uestc-script-status uestc-script-status--error" role="status">{labels.failed}</p>
          ) : (
            <span className="sr-only" role="status">{copyState === 'copied' ? labels.copied : ''}</span>
          )}
        </div>
      </div>
      {attribution ? (
        <p className="uestc-attribution">
          <span>{attribution}</span>
          {attributionLinks ? (
            <span className="uestc-attribution__links">
              <a href="https://github.com/samuelhe52/uestc-coursetable-parser" target="_blank" rel="noopener noreferrer">{attributionLinks.forkLabel}</a>
              <span aria-hidden="true"> · </span>
              <a href="https://github.com/Saafo/uestc-coursetable-parser" target="_blank" rel="noopener noreferrer">{attributionLinks.sourceLabel}</a>
              <span aria-hidden="true"> · </span>
              <a href="/licenses/uestc-course2ics-GPL-3.0.txt" target="_blank" rel="noopener noreferrer">{attributionLinks.licenseLabel}</a>
            </span>
          ) : null}
        </p>
      ) : null}
    </Card>
  )
}

export function UestcToolsPage() {
  const { copy } = useOutletContext<AppOutletContext>()
  const [mode, setMode] = useState<Mode>('encrypt')
  const [input, setInput] = useState('')
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const [swapTick, setSwapTick] = useState(0)
  const [calendarStartDate, setCalendarStartDate] = useState('')

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
  const copyLabel = copyState === 'copied'
    ? copy.tool.copied
    : copyState === 'failed'
      ? copy.tool.copyFailed
      : copy.tool.copy

  function handleSwap() {
    setSwapTick((tick) => tick + 1)
    setMode((currentMode) => currentMode === 'encrypt' ? 'decrypt' : 'encrypt')
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
    if (canJump) {
      window.open(output, '_blank', 'noopener,noreferrer')
    }
  }

  const inputLabel = mode === 'encrypt' ? copy.tool.inputLabelEncrypt : copy.tool.inputLabelDecrypt
  const outputLabel = mode === 'encrypt' ? copy.tool.outputLabelEncrypt : copy.tool.outputLabelDecrypt
  const scriptLabels = {
    copy: copy.uestc.copyScript,
    copying: copy.uestc.copyingScript,
    copied: copy.uestc.scriptCopied,
    failed: copy.uestc.scriptCopyFailed,
    view: copy.uestc.viewScript,
  }
  const calendarStartDateValid = isMondayDate(calendarStartDate)
  const calendarStartDateHintId = 'uestc-calendar-start-date-hint'

  return (
    <section className="page page--tool page--uestc">
      <div className="home-hero tool-hero">
        <h1 className="home-hero__title">{copy.uestc.title}</h1>
        <p className="home-hero__subtitle">{copy.uestc.description}</p>
      </div>

      <Card className="tool-surface uestc-section">
        <div className="uestc-section__heading">
          <span className="uestc-section__number" aria-hidden="true">01</span>
          <div>
            <h2 className="uestc-section__title">{copy.uestc.vpnTitle}</h2>
            <p className="uestc-section__description">{copy.uestc.vpnDescription}</p>
          </div>
        </div>

        <div className="url-pair">
          <InputField
            label={inputLabel}
            placeholder={mode === 'encrypt' ? copy.tool.encryptPlaceholder : copy.tool.decryptPlaceholder}
            value={input}
            autoFocus
            onChange={(event) => setInput(event.target.value)}
          />

          <button type="button" className="swap-btn" aria-label={copy.tool.swapAriaLabel} onClick={handleSwap}>
            <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ transition: 'transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)', transform: `rotate(${swapTick * 180}deg)` }}>
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
            trailingButton={output && !isError ? (
              <button type="button" className={`url-field__copy-btn${copyState === 'copied' ? ' url-field__copy-btn--copied' : ''}`} aria-label={copy.tool.copy} onClick={() => void handleCopyAsync()}>
                {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
              </button>
            ) : undefined}
          />
        </div>

        <div className="tool-actions">
          <Button type="button" variant={copyState === 'copied' ? 'success' : 'secondary'} disabled={!output || isError} onClick={() => void handleCopyAsync()}>
            {copyState === 'copied' ? <CheckIcon /> : <CopyIcon />}
            {copyLabel}
          </Button>
          <Button type="button" disabled={!canJump} onClick={handleJump}>
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
            {copy.tool.jumpTo}
          </Button>
        </div>

        {isError && output ? (
          <p className="status-msg status-msg--error">{copy.tool.convertFailed}</p>
        ) : !canJump && output ? (
          <p className="status-msg status-msg--error">{copy.tool.jumpUnavailable}</p>
        ) : null}
      </Card>

      <ScriptSection number="02" title={copy.uestc.pdfTitle} description={copy.uestc.pdfDescription} steps={copy.uestc.pdfSteps} consoleStep={copy.uestc.consoleStep} consoleInstructions={copy.uestc.consoleInstructions} scriptPath={PDF_SCRIPT_PATH} labels={scriptLabels} />
      <ScriptSection
        number="03"
        title={copy.uestc.calendarTitle}
        description={copy.uestc.calendarDescription}
        steps={copy.uestc.calendarSteps}
        consoleStep={copy.uestc.consoleStep}
        consoleInstructions={copy.uestc.consoleInstructions}
        scriptPath={CALENDAR_SCRIPT_PATH}
        configuration={(
          <div className="uestc-calendar-date">
            <label className="uestc-calendar-date__label" htmlFor="uestc-calendar-start-date">
              {copy.uestc.calendarStartDateLabel}
            </label>
            <input
              id="uestc-calendar-start-date"
              className={`uestc-calendar-date__input${calendarStartDateValid ? '' : ' uestc-calendar-date__input--error'}`}
              type="date"
              value={calendarStartDate}
              aria-describedby={calendarStartDateHintId}
              aria-invalid={!calendarStartDateValid}
              onChange={(event) => setCalendarStartDate(event.target.value)}
            />
            <p
              id={calendarStartDateHintId}
              className={`uestc-calendar-date__hint${calendarStartDateValid ? '' : ' uestc-calendar-date__hint--error'}`}
            >
              {calendarStartDateValid ? copy.uestc.calendarStartDateHint : copy.uestc.calendarStartDateInvalid}
            </p>
          </div>
        )}
        copyDisabled={!calendarStartDateValid}
        copyResetKey={calendarStartDate}
        transformScript={(source) => configureCalendarScript(source, calendarStartDate)}
        attribution={copy.uestc.calendarAttribution}
        attributionLinks={{ forkLabel: copy.uestc.forkRepository, sourceLabel: copy.uestc.sourceRepository, licenseLabel: copy.uestc.licenseTerms }}
        labels={scriptLabels}
      />

      <p className="tool-notice uestc-privacy">{copy.uestc.privacy}</p>
    </section>
  )
}
