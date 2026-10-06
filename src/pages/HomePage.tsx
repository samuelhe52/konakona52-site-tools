import type { CSSProperties } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../components/AppShell'
import { TOOLS } from '../lib/tools'

export function HomePage() {
  const { copy } = useOutletContext<AppOutletContext>()

  return (
    <section className="page page--home">
      <header className="page-header page-header--home">
        <p className="page-header__meta" aria-hidden="true">
          <span className="page-header__index">~/</span>
          <span>index · {String(TOOLS.length).padStart(2, '0')} tools</span>
        </p>
        <h1 className="page-header__title">{copy.home.title}</h1>
        <p className="page-header__lede">{copy.home.subtitle}</p>
      </header>
      <ol className="tool-index">
        {TOOLS.map((tool, position) => (
          <li key={tool.path} style={{ '--row': position } as CSSProperties}>
            <Link to={tool.path} className="tool-index__row">
              <span className="tool-index__number" aria-hidden="true">{tool.index}</span>
              <span className="tool-index__title">{tool.title(copy)}</span>
              <span className="tool-index__desc">{tool.description(copy)}</span>
              <span className="tool-index__path" aria-hidden="true">{tool.path}</span>
              <span className="tool-index__arrow" aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
        <li className="tool-index__pending" style={{ '--row': TOOLS.length } as CSSProperties}>
          <span className="tool-index__number" aria-hidden="true">--</span>
          <span>{copy.home.moreComing}</span>
        </li>
      </ol>
    </section>
  )
}
