import { Link } from 'react-router-dom'
import { useTheme } from '../App'

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21M5.6 5.6l1.06 1.06M17.34 17.34l1.06 1.06M5.6 18.4l1.06-1.06M17.34 6.66l1.06-1.06" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
    </svg>
  )
}

interface Props {
  title: string
  subtitle: string
  children: React.ReactNode
}

export default function ToolPage({ title, subtitle, children }: Props) {
  const { theme, toggle } = useTheme()

  return (
    <div className="page-root">
      <header className="kp-header">
        <div className="brand">
          <span className="pi-mark">π</span>
          <span>Plumber</span>
        </div>
        <div className="kp-header-right">
          <Link to="/" className="back-link">← plumber</Link>
          <button
            className="theme-toggle"
            onClick={toggle}
            aria-label="toggle theme"
            title="toggle theme"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <main className="kp-main">
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
        {children}
      </main>

      <footer className="kp-footer">
        <code style={{ fontFamily: 'var(--kp-font-mono)' }}>curl plumber.kevinprk.com — returns your IP as plain text</code>
        <span className="pi">π</span>
      </footer>
    </div>
  )
}
