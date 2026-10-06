import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import type { Locale } from '../lib/locale'
import { getCopy, type CopySet } from '../lib/strings'
import { applyTheme, getStoredTheme, setStoredTheme, type Theme } from '../lib/theme'

export type AppOutletContext = {
  locale: Locale
  copy: CopySet
}

type AppShellProps = {
  locale: Locale
}

function toolTitleFor(pathname: string, copy: CopySet): string | undefined {
  switch (pathname.replace(/\/+$/, '')) {
    case '/chatgpt-share':
      return copy.home.chatgptShareTitle
    case '/markdown-viewer':
      return copy.home.markdownTitle
    case '/uestc':
      return copy.home.toolTitle
    default:
      return undefined
  }
}

function ThemeIcon({ theme }: { theme: Theme }) {
  return (
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
    >
      {theme === 'light' ? (
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </>
      ) : theme === 'dark' ? (
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      ) : (
        <>
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </>
      )}
    </svg>
  )
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
      <ThemeIcon theme={theme} />
    </button>
  )
}

export function AppShell({ locale }: AppShellProps) {
  const copy = getCopy(locale)
  const { pathname } = useLocation()
  const toolTitle = toolTitleFor(pathname, copy)
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
        <nav className={`topbar__trail${toolTitle ? ' topbar__trail--nested' : ''}`} aria-label={copy.siteTitle}>
          <Link to="/" className="brand" aria-current={toolTitle ? undefined : 'page'}>
            <span className="brand__icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </span>
            <span className="brand__title">{copy.siteTitle}</span>
          </Link>
          {toolTitle ? (
            <>
              <span className="topbar__separator" aria-hidden="true">/</span>
              <span className="topbar__current" aria-current="page">{toolTitle}</span>
            </>
          ) : null}
        </nav>
        <div className="topbar__right">
          <ThemeToggle copy={copy} />
        </div>
      </header>
      <main className="page-shell">
        <Outlet context={{ locale, copy } satisfies AppOutletContext} />
      </main>
      <footer className="site-footer">
        <span className="footer-copy">© {year} konakona</span>
        <div className="footer-links">
          <a
            href="mailto:samuelhe52@outlook.com"
            aria-label="Email"
            title="Email"
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
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </a>
          <a
            href="https://github.com/samuelhe52"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            title="GitHub"
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
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  )
}
