import { Link, useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../components/AppShell'

export function HomePage() {
  const { copy } = useOutletContext<AppOutletContext>()

  return (
    <section className="page page--home">
      <div className="home-hero">
        <h1 className="home-hero__title">{copy.home.heroTitle}</h1>
        <p className="home-hero__subtitle">{copy.home.heroSubtitle}</p>
      </div>
      <div className="tools-grid">
        <Link to="/chatgpt-share" className="tool-card">
          <div className="tool-card__header">
            <span className="tool-card__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15a4 4 0 0 1-4 4H7l-4 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" /><path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" /></svg>
            </span>
            <svg className="tool-card__arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </div>
          <h2 className="tool-card__title">{copy.home.chatgptShareTitle}</h2>
          <p className="tool-card__desc">{copy.home.chatgptShareDescription}</p>
        </Link>
        <Link to="/markdown-viewer" className="tool-card">
          <div className="tool-card__header">
            <span className="tool-card__icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6M8 13h8M8 17h5" />
              </svg>
            </span>
            <svg className="tool-card__arrow" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6" /></svg>
          </div>
          <h2 className="tool-card__title">{copy.home.markdownTitle}</h2>
          <p className="tool-card__desc">{copy.home.markdownDescription}</p>
        </Link>
        <Link to="/uestc-vpn" className="tool-card">
          <div className="tool-card__header">
            <span className="tool-card__icon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <svg
              className="tool-card__arrow"
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
          <h2 className="tool-card__title">{copy.home.toolTitle}</h2>
          <p className="tool-card__desc">{copy.home.toolDescription}</p>
        </Link>
      </div>
      <div className="empty-state">
        {copy.home.moreComing}
      </div>
    </section>
  )
}
