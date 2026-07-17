import { useDeferredValue, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../components/AppShell'
import { MarkdownPreview } from '../components/MarkdownPreview'

const STARTER_MARKDOWN = `# A fresh Markdown preview

Paste Markdown here, or import a \`.md\` file. Your content stays in this browser tab.

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
  const inputRef = useRef<HTMLInputElement>(null)
  const isChinese = locale === 'zh-CN'
  const deferredSource = useDeferredValue(source)

  const labels = isChinese
    ? {
        title: 'Markdown 在线预览',
        description: '粘贴文本或导入 .md 文件，即刻获得可读的文档预览。内容始终保留在此浏览器标签页中。',
        import: '导入 .md',
        paste: '粘贴 Markdown',
        clear: '清空',
        editor: 'Markdown 源码',
        preview: '预览',
        drop: '把 .md 文件拖到这里',
        empty: '从左侧开始输入，预览会实时更新。',
        back: '工具箱',
      }
    : {
        title: 'Preview Markdown, instantly',
        description: 'Paste text or import a .md file for a clean document preview. Your content stays in this browser tab.',
        import: 'Import .md',
        paste: 'Paste Markdown',
        clear: 'Clear',
        editor: 'Markdown source',
        preview: 'Preview',
        drop: 'Drop a .md file here',
        empty: 'Start writing on the left. Your preview updates as you type.',
        back: 'Toolbox',
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

  return (
    <section className="page page--markdown">
      <div className="markdown-hero">
        <Link to="/" className="back-link">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
          {labels.back}
        </Link>
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
        <div className="markdown-pane markdown-pane--editor">
          <div className="markdown-pane__bar">
            <span>{labels.editor}</span>
            <div className="markdown-pane__actions">
              <button className="markdown-icon-button" type="button" onClick={() => { setSource(''); setFileName(null) }} aria-label={labels.clear} title={labels.clear}><ClearIcon /></button>
              <input ref={inputRef} className="markdown-file-input" type="file" accept=".md,text/markdown" onChange={handleUpload} />
              <button className="markdown-action markdown-action--secondary" type="button" onClick={() => inputRef.current?.click()}><UploadIcon />{labels.import}</button>
              <button className="markdown-action markdown-action--primary" type="button" onClick={pasteFromClipboard}><ClipboardIcon />{labels.paste}</button>
            </div>
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
      </div>
      <p className="markdown-privacy-note">{isChinese ? '无需上传，无需账户。文件仅在你的浏览器中读取。' : 'No upload, no account. Files are read only in your browser.'}</p>
    </section>
  )
}
