import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import Markdown, { type Components } from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import 'katex/dist/katex.min.css'
import { MermaidDiagram } from './MermaidDiagram'
import { normalizeMathDelimiters } from '../lib/markdown'

type MarkdownPreProps = ComponentPropsWithoutRef<'pre'> & {
  node?: unknown
}

type MarkdownTableProps = ComponentPropsWithoutRef<'table'> & {
  node?: unknown
}

function MarkdownPre({ children, node: _node, ...props }: MarkdownPreProps) {
  if (isValidElement<{ className?: string; children?: ReactNode }>(children)) {
    const language = children.props.className?.match(/language-(\S+)/)?.[1]
    if (language === 'mermaid') {
      return <MermaidDiagram chart={String(children.props.children).replace(/\n$/, '')} />
    }
  }

  return <pre {...props}>{children}</pre>
}

function MarkdownTable({ node: _node, ...props }: MarkdownTableProps) {
  return (
    <div className="markdown-table-wrap">
      <table {...props} />
    </div>
  )
}

const MARKDOWN_COMPONENTS: Components = {
  pre: MarkdownPre,
  table: MarkdownTable,
}

type MarkdownPreviewProps = {
  children: string
  className?: string
}

export function MarkdownPreview({ children, className }: MarkdownPreviewProps) {
  return (
    <div className={className ? `markdown-preview ${className}` : 'markdown-preview'}>
      <Markdown
        components={MARKDOWN_COMPONENTS}
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[
          rehypeRaw,
          rehypeSanitize,
          rehypeKatex,
          [rehypeHighlight, {
            detect: true,
            plainText: ['mermaid'],
            subset: ['bash', 'diff', 'ini', 'javascript', 'json', 'markdown', 'python', 'sql', 'typescript', 'yaml'],
          }],
        ]}
      >
        {normalizeMathDelimiters(children)}
      </Markdown>
    </div>
  )
}
