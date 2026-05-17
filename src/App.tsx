import { useState, useEffect } from 'react'
import IpCheck from './components/IpCheck'
import DnsLookup from './components/DnsLookup'
import EpochCalc from './components/EpochCalc'

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

export default function App() {
  const [tab, setTab] = useState<'ip' | 'dns' | 'epoch'>('ip')
  const [theme, setTheme] = useState<'light' | 'dark'>(
    () => window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  return (
    <div className="page-root">
      <header className="kp-header">
        <div className="brand">
          <span className="pi-mark">π</span>
          <span>Plumber</span>
        </div>
        <div className="kp-header-right">
          <a href="https://kevinprk.com" className="back-link">← kevinprk.com</a>
          <button
            className="theme-toggle"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            aria-label="toggle theme"
            title="toggle theme"
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>
      </header>

      <main className="kp-main">
        <h1>Plumber</h1>
        <p className="subtitle">a small network toolbox. look up DNS records, check your IP, convert epoch timestamps.</p>

        <div className="kp-tabs">
          <button
            className={'kp-tab' + (tab === 'ip' ? ' active' : '')}
            onClick={() => setTab('ip')}
          >
            my IP
          </button>
          <button
            className={'kp-tab' + (tab === 'dns' ? ' active' : '')}
            onClick={() => setTab('dns')}
          >
            DNS lookup
          </button>
          <button
            className={'kp-tab' + (tab === 'epoch' ? ' active' : '')}
            onClick={() => setTab('epoch')}
          >
            epoch
          </button>
        </div>

        {tab === 'ip' && <IpCheck />}
        {tab === 'dns' && <DnsLookup />}
        {tab === 'epoch' && <EpochCalc />}
      </main>

      <footer className="kp-footer">
        <code style={{ fontFamily: 'var(--kp-font-mono)' }}>curl plumber.kevinprk.com — returns your IP as plain text</code>
        <span className="pi" title="3.14">π</span>
      </footer>
    </div>
  )
}
