function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function safeUrl(value: string, image = false) {
  const decoded = value.replaceAll('&amp;', '&').trim()
  if (decoded.startsWith('/') || decoded.startsWith('./') || decoded.startsWith('../')) return value
  if (/^https?:\/\//i.test(decoded)) return value
  if (!image && /^mailto:/i.test(decoded)) return value
  return '#'
}

function inlineMarkdown(value: string) {
  let html = escapeHtml(value)

  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/!\[([^\]]*)\]\(([^\s)]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_match, alt, url) => `<img src="${safeUrl(url, true)}" alt="${alt}" />`)
  html = html.replace(/\[([^\]]+)\]\(([^\s)]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (_match, label, url) => `<a href="${safeUrl(url)}" target="_blank" rel="noreferrer">${label}</a>`)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>')
  html = html.replace(/~~([^~]+)~~/g, '<del>$1</del>')

  return html
}

export function renderMarkdown(source: string) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const output: string[] = []
  let inCodeBlock = false
  let codeLines: string[] = []
  let listType: 'ul' | 'ol' | null = null
  let quoteLines: string[] = []
  let paragraphLines: string[] = []

  function closeList() {
    if (listType) {
      output.push(`</${listType}>`)
      listType = null
    }
  }

  function closeQuote() {
    if (quoteLines.length > 0) {
      output.push(`<blockquote>${quoteLines.map(inlineMarkdown).join('<br />')}</blockquote>`)
      quoteLines = []
    }
  }

  function closeParagraph() {
    if (paragraphLines.length > 0) {
      output.push(`<p>${paragraphLines.map(inlineMarkdown).join('<br />')}</p>`)
      paragraphLines = []
    }
  }

  function closeOpenBlocks() {
    closeParagraph()
    closeQuote()
    closeList()
  }

  for (const line of lines) {
    const codeMatch = line.match(/^```\s*([^\s]*)\s*$/)
    if (codeMatch) {
      if (inCodeBlock) {
        output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
        codeLines = []
        inCodeBlock = false
      } else {
        closeOpenBlocks()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeLines.push(line)
      continue
    }

    if (/^\s*$/.test(line)) {
      closeOpenBlocks()
      continue
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      closeOpenBlocks()
      const level = heading[1].length
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`)
      continue
    }

    if (/^(---|\*\*\*|___)\s*$/.test(line)) {
      closeOpenBlocks()
      output.push('<hr />')
      continue
    }

    const quote = line.match(/^>\s?(.*)$/)
    if (quote) {
      closeParagraph()
      closeList()
      quoteLines.push(quote[1])
      continue
    }

    const unordered = line.match(/^[-*+]\s+(.+)$/)
    const ordered = line.match(/^\d+[.)]\s+(.+)$/)
    const listItem = unordered?.[1] ?? ordered?.[1]
    if (listItem !== undefined) {
      closeParagraph()
      closeQuote()
      const nextType = unordered ? 'ul' : 'ol'
      if (listType && listType !== nextType) closeList()
      if (!listType) {
        listType = nextType
        output.push(`<${listType}>`)
      }
      const task = listItem.match(/^\[([ xX])\]\s+(.+)$/)
      output.push(
        task
          ? `<li class="task-item"><input type="checkbox" disabled ${task[1].toLowerCase() === 'x' ? 'checked' : ''} />${inlineMarkdown(task[2])}</li>`
          : `<li>${inlineMarkdown(listItem)}</li>`,
      )
      continue
    }

    closeQuote()
    closeList()
    paragraphLines.push(line)
  }

  if (inCodeBlock) {
    output.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`)
  }
  closeOpenBlocks()

  return output.join('\n')
}
