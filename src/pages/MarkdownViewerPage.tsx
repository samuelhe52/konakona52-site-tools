import { useDeferredValue, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../components/AppShell'
import { MarkdownPreview } from '../components/MarkdownPreview'

type WorkspaceLayout = 'split' | 'full'
type FullView = 'source' | 'rendered'

const STARTER_MARKDOWN = `# A fresh Markdown preview

Paste Markdown here, or import a \`.md\` file.

## What it supports

- Headings, **bold text**, and _emphasis_
- Links, lists, quotes, and code blocks
- [x] Live preview
- [ ] Your next great document

> Keep the source on the left and a readable document on the right.

<details>
  <summary>Safe custom HTML is supported</summary>
  <p>Useful semantic elements are rendered; scripts and unsafe attributes are removed.</p>
</details>

$$
E = mc^2
$$

\\[
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
\\]

\`\`\`mermaid
flowchart LR
  Write[Write Markdown] --> Preview[Preview it instantly]
\`\`\`

\`\`\`ts
const message = 'Hello, Markdown!'
console.log(message)
\`\`\`
`

function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 20h14" />
    </svg>
  )
}

function ClipboardIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="14" height="16" x="5" y="5" rx="2" />
      <path d="M9 5V3h6v2" />
      <path d="M9 11h6M9 15h4" />
    </svg>
  )
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  )
}

export function MarkdownViewerPage() {
  const { locale } = useOutletContext<AppOutletContext>()
  const [source, setSource] = useState(STARTER_MARKDOWN)
  const [fileName, setFileName] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [workspaceLayout, setWorkspaceLayout] = useState<WorkspaceLayout>('split')
  const [fullView, setFullView] = useState<FullView>('rendered')
  const inputRef = useRef<HTMLInputElement>(null)
  const isChinese = locale === 'zh-CN'
  const deferredSource = useDeferredValue(source)

  const labels = isChinese
    ? {
        title: 'Markdown 在线预览',
        description: '粘贴文本或导入 .md 文件，即刻获得可读的文档预览。',
        import: '导入 .md',
        importCompact: '导入',
        paste: '粘贴 Markdown',
        pasteCompact: '粘贴',
        clear: '清空',
        editor: 'Markdown 源码',
        preview: '预览',
        drop: '把 .md 文件拖到这里',
        empty: '从左侧开始输入，预览会实时更新。',
        layout: '布局',
        sideBySide: '并排',
        sideBySideCompact: '并排',
        full: '全宽',
        fullView: '全宽视图',
        source: '源码',
        rendered: '渲染',
      }
    : {
        title: 'Preview Markdown, instantly',
        description: 'Paste text or import a .md file for a clean document preview.',
        import: 'Import .md',
        importCompact: 'Import',
        paste: 'Paste Markdown',
        pasteCompact: 'Paste',
        clear: 'Clear',
        editor: 'Markdown source',
        preview: 'Preview',
        drop: 'Drop a .md file here',
        empty: 'Start writing on the left. Your preview updates as you type.',
        layout: 'Layout',
        sideBySide: 'Side by side',
        sideBySideCompact: 'Split',
        full: 'Full',
        fullView: 'Full view',
        source: 'Source',
        rendered: 'Rendered',
      }

  function loadFile(file: File | undefined) {
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.md') && file.type !== 'text/markdown') return

    const reader = new FileReader()
    reader.onload = () => {
      setSource(typeof reader.result === 'string' ? reader.result : '')
      setFileName(file.name)
    }
    reader.readAsText(file)
  }

  function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    loadFile(event.target.files?.[0])
    event.target.value = ''
  }

  async function pasteFromClipboard() {
    try {
      const clipboardText = await navigator.clipboard.readText()
      if (clipboardText) {
        setSource(clipboardText)
        setFileName(null)
      }
    } catch {
      inputRef.current?.focus()
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setIsDragging(false)
    loadFile(event.dataTransfer.files[0])
  }

  const lineCount = source ? source.split('\n').length : 0
  const lineLabel = isChinese ? `${lineCount} 行` : `${lineCount} ${lineCount === 1 ? 'line' : 'lines'}`
  const showEditor = workspaceLayout === 'split' || fullView === 'source'
  const showPreview = workspaceLayout === 'split' || fullView === 'rendered'

  return (
    <section className="page page--markdown">
      <div className="markdown-hero">
        <h1>{labels.title}</h1>
        <p>{labels.description}</p>
      </div>

      <div
        className={`markdown-workspace ${isDragging ? 'markdown-workspace--dragging' : ''}`}
        onDragEnter={(event) => { event.preventDefault(); setIsDragging(true) }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {isDragging && <div className="markdown-drop-zone">{labels.drop}</div>}
        <div className="markdown-workspace__toolbar">
          <div className="markdown-workspace__view-controls">
            <div className="markdown-view-switch" role="group" aria-label={labels.layout}>
              <button type="button" aria-label={labels.sideBySide} aria-pressed={workspaceLayout === 'split'} onClick={() => setWorkspaceLayout('split')}>
                <span className="markdown-control-label markdown-control-label--full">{labels.sideBySide}</span>
                <span className="markdown-control-label markdown-control-label--compact">{labels.sideBySideCompact}</span>
              </button>
              <button type="button" aria-pressed={workspaceLayout === 'full'} onClick={() => setWorkspaceLayout('full')}>{labels.full}</button>
            </div>
            {workspaceLayout === 'full' ? (
              <>
                <span className="markdown-toolbar-divider" aria-hidden="true" />
                <div className="markdown-view-switch" role="group" aria-label={labels.fullView}>
                  <button type="button" aria-pressed={fullView === 'source'} onClick={() => setFullView('source')}>{labels.source}</button>
                  <button type="button" aria-pressed={fullView === 'rendered'} onClick={() => setFullView('rendered')}>{labels.rendered}</button>
                </div>
              </>
            ) : null}
          </div>
          <div className="markdown-workspace__actions">
            <input ref={inputRef} className="markdown-file-input" type="file" accept=".md,text/markdown" onChange={handleUpload} />
            <button className="markdown-action markdown-action--secondary" type="button" aria-label={labels.import} onClick={() => inputRef.current?.click()}>
              <UploadIcon />
              <span className="markdown-control-label markdown-control-label--full">{labels.import}</span>
              <span className="markdown-control-label markdown-control-label--compact">{labels.importCompact}</span>
            </button>
            <button className="markdown-action markdown-action--primary" type="button" aria-label={labels.paste} onClick={pasteFromClipboard}>
              <ClipboardIcon />
              <span className="markdown-control-label markdown-control-label--full">{labels.paste}</span>
              <span className="markdown-control-label markdown-control-label--compact">{labels.pasteCompact}</span>
            </button>
            <span className="markdown-toolbar-divider" aria-hidden="true" />
            <button className="markdown-action markdown-action--secondary" type="button" onClick={() => { setSource(''); setFileName(null) }}><ClearIcon />{labels.clear}</button>
          </div>
        </div>
        <div className={`markdown-workspace__body ${workspaceLayout === 'full' ? 'markdown-workspace__body--full' : ''}`}>
          {showEditor ? (
            <div className="markdown-pane markdown-pane--editor">
              <div className="markdown-pane__bar">
                <span>{labels.editor}</span>
              </div>
              <textarea
                value={source}
                onChange={(event) => { setSource(event.target.value); setFileName(null) }}
                className="markdown-editor"
                aria-label={labels.editor}
                spellCheck={false}
                placeholder="# Markdown"
              />
              <div className="markdown-pane__status">
                <span>{fileName ?? lineLabel}</span>
                <span>{source.length} {isChinese ? '字符' : 'characters'}</span>
              </div>
            </div>
          ) : null}

          {showPreview ? (
            <article className="markdown-pane markdown-pane--preview">
              <div className="markdown-pane__bar markdown-pane__bar--preview"><span>{labels.preview}</span><span className="markdown-live"><i />{isChinese ? '实时更新' : 'Live'}</span></div>
              {deferredSource.trim() ? (
                <MarkdownPreview>{deferredSource}</MarkdownPreview>
              ) : (
                <div className="markdown-preview">
                  <p className="markdown-preview__empty">{labels.empty}</p>
                </div>
              )}
            </article>
          ) : null}
        </div>
      </div>
    </section>
  )
}
