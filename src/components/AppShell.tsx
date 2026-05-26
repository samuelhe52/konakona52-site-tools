import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
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

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('system')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const stored = getStoredTheme()
    setTheme(stored)
    applyTheme(stored)
  }, [])

  function cycleTheme() {
    const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light'
    setTheme(next)
    setStoredTheme(next)
    applyTheme(next)
  }

  // Avoid hydration mismatch — render a placeholder until mounted
  if (!mounted) {
    return (
      <button
        type="button"
        className="theme-toggle"
        aria-label="Theme"
        disabled
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
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      </button>
    )
  }

  const icon =
    theme === 'light' ? (
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
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2" />
        <path d="M12 20v2" />
        <path d="m4.93 4.93 1.41 1.41" />
        <path d="m17.66 17.66 1.41 1.41" />
        <path d="M2 12h2" />
        <path d="M20 12h2" />
        <path d="m6.34 17.66-1.41 1.41" />
        <path d="m19.07 4.93-1.41 1.41" />
      </svg>
    ) : theme === 'dark' ? (
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
      >
        <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
      </svg>
    ) : (
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
      >
        <rect width="20" height="14" x="2" y="3" rx="2" />
        <line x1="8" x2="16" y1="21" y2="21" />
        <line x1="12" x2="12" y1="17" y2="21" />
      </svg>
    )

  const label =
    theme === 'light' ? 'Light mode' : theme === 'dark' ? 'Dark mode' : 'System preference'

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Theme: ${label}. Click to cycle.`}
      title={label}
      onClick={cycleTheme}
    >
      {icon}
    </button>
  )
}

export function AppShell({ locale }: AppShellProps) {
  const copy = getCopy(locale)
  const year = new Date().getFullYear()

  return (
    <div className="site-frame">
      <div className="site-backdrop" aria-hidden="true" />
      <header className="topbar">
        <Link to="/" className="brand">
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
            >
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </span>
          <span className="brand__title">{copy.siteTitle}</span>
        </Link>
        <div className="topbar__right">
          <ThemeToggle />
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
