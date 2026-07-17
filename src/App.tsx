import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import type { Locale } from './lib/locale'
import { detectLocale, parseLocaleOverride } from './lib/locale'
import { HomePage } from './pages/HomePage'
import { UestcVpnPage } from './pages/UestcVpnPage'

const MarkdownViewerPage = lazy(async () => {
  const module = await import('./pages/MarkdownViewerPage')
  return { default: module.MarkdownViewerPage }
})

type AppProps = {
  locale?: Locale
}

function readNavigatorLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') {
    return ['en']
  }

  if (navigator.languages.length > 0) {
    return navigator.languages
  }

  return navigator.language ? [navigator.language] : ['en']
}

function readLocaleOverride(): Locale | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  return parseLocaleOverride(new URLSearchParams(window.location.search).get('locale'))
}

function App({ locale }: AppProps) {
  const activeLocale = locale ?? readLocaleOverride() ?? detectLocale(readNavigatorLanguages())

  return (
    <Routes>
      <Route element={<AppShell locale={activeLocale} />}>
        <Route index element={<HomePage />} />
        <Route
          path="markdown-viewer"
          element={(
            <Suspense fallback={null}>
              <MarkdownViewerPage />
            </Suspense>
          )}
        />
        <Route path="uestc-vpn" element={<UestcVpnPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
