export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'theme-preference'

export function getStoredTheme(): Theme {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') {
      return raw
    }
  } catch {
    // localStorage may be unavailable
  }
  return 'system'
}

export function setStoredTheme(theme: Theme): void {
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // localStorage may be unavailable
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  const isDark = theme === 'dark' || (theme === 'system' && prefersDark)

  root.classList.toggle('light', theme === 'light')
  root.classList.toggle('dark', isDark)
  root.style.colorScheme = isDark ? 'dark' : 'light'
}
