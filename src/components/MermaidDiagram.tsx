import { useEffect, useId, useState } from 'react'

type MermaidDiagramProps = {
  chart: string
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const chartId = useId().replaceAll(':', '')
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function renderDiagram() {
      try {
        setSvg(null)
        setError(null)

        const { default: mermaid } = await import('mermaid')
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: document.documentElement.classList.contains('dark') ? 'dark' : 'default',
        })

        const { svg: renderedSvg } = await mermaid.render(`mermaid-${chartId}`, chart)
        if (!cancelled) setSvg(renderedSvg)
      } catch (reason) {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'Could not render this Mermaid diagram.')
        }
      }
    }

    void renderDiagram()

    return () => {
      cancelled = true
    }
  }, [chart, chartId])

  if (error) {
    return (
      <div className="markdown-mermaid markdown-mermaid--error" role="status">
        <strong>Mermaid diagram could not be rendered.</strong>
        <code>{error}</code>
      </div>
    )
  }

  if (!svg) {
    return <div className="markdown-mermaid markdown-mermaid--loading">Rendering diagram…</div>
  }

  // Mermaid returns its own SVG. Strict security mode disables untrusted HTML labels.
  return <div className="markdown-mermaid" dangerouslySetInnerHTML={{ __html: svg }} />
}
