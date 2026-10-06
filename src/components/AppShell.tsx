import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import type { Locale } from '../lib/locale'
import { getCopy, type CopySet } from '../lib/strings'
import { applyTheme, getStoredTheme, setStoredTheme, type Theme } from '../lib/theme'
import { toolForPath } from '../lib/tools'

export type AppOutletContext = {
  locale: Locale
  copy: CopySet
}

type AppShellProps = {
  locale: Locale
}

function ThemeToggle({ copy }: { copy: CopySet }) {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)

  useEffect(() => {
    applyTheme(theme)
    if (theme !== 'system' || !window.matchMedia) return

    // Follow OS-level appearance changes while the preference is "system".
    const query = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => applyTheme('system')
    query.addEventListener('change', handleChange)
    return () => query.removeEventListener('change', handleChange)
  }, [theme])

  function cycleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
    setStoredTheme(next)
  }

  const label = theme === 'light'
    ? copy.shell.themeLight
    : theme === 'dark'
      ? copy.shell.themeDark
      : copy.shell.themeSystem

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`${label}. ${copy.shell.themeCycle}`}
      title={label}
      onClick={cycleTheme}
    >
      <span className="theme-toggle__key" aria-hidden="true">theme</span>
      <span className="theme-toggle__value" aria-hidden="true">{theme === 'system' ? 'auto' : theme}</span>
    </button>
  )
}

export function AppShell({ locale }: AppShellProps) {
  const copy = getCopy(locale)
  const { pathname } = useLocation()
  const tool = toolForPath(pathname)
  const toolTitle = tool?.title(copy)
  const year = new Date().getFullYear()

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  useEffect(() => {
    document.title = toolTitle ? `${toolTitle} · ${copy.siteTitle}` : copy.siteTitle
  }, [toolTitle, copy.siteTitle])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="site-frame">
      <header className="topbar">
        <nav className={`topbar__trail${tool ? ' topbar__trail--nested' : ''}`} aria-label={copy.siteTitle}>
          <Link to="/" className="brand" aria-current={tool ? undefined : 'page'}>
            <span className="brand__mark" aria-hidden="true" />
            <span className="brand__title">{copy.siteTitle}</span>
          </Link>
          {tool ? (
            <>
              <span className="topbar__separator" aria-hidden="true">/</span>
              <span className="topbar__current" aria-current="page">
                <span className="topbar__index" aria-hidden="true">{tool.index}</span>
                {toolTitle}
              </span>
            </>
          ) : null}
        </nav>
        <ThemeToggle copy={copy} />
      </header>
      <main className="page-shell">
        <Outlet context={{ locale, copy } satisfies AppOutletContext} />
      </main>
      <footer className="site-footer">
        <span>© {year} konakona</span>
        <div className="footer-links">
          <a href="mailto:samuelhe52@outlook.com">mail</a>
          <a href="https://github.com/samuelhe52" target="_blank" rel="noopener noreferrer">
            github<span aria-hidden="true">↗</span>
          </a>
        </div>
      </footer>
    </div>
  )
}
