import { useState, useEffect } from 'react'

function formatRelative(date: Date): string {
  const diffMs = Date.now() - date.getTime()
  const abs = Math.abs(diffMs)
  const future = diffMs < 0

  const units: [number, string][] = [
    [60_000, 'minute'],
    [3_600_000, 'hour'],
    [86_400_000, 'day'],
    [2_592_000_000, 'month'],
    [31_536_000_000, 'year'],
  ]

  if (abs < 60_000) return 'just now'

  let label = ''
  let prev = 1000
  for (const [ms, unit] of units) {
    if (abs < ms) {
      const n = Math.floor(abs / prev)
      label = `${n} ${unit}${n !== 1 ? 's' : ''}`
      break
    }
    prev = ms
  }
  if (!label) {
    const n = Math.floor(abs / 31_536_000_000)
    label = `${n} year${n !== 1 ? 's' : ''}`
  }

  return future ? `in ${label}` : `${label} ago`
}

function epochToUtc(raw: string): { utc: string; iso: string; relative: string; ms: number } | null {
  const n = raw.trim()
  if (!n || isNaN(Number(n))) return null

  const num = Number(n)
  const ms = n.length >= 13 ? num : num * 1000
  const date = new Date(ms)
  if (isNaN(date.getTime())) return null

  const pad = (v: number) => String(v).padStart(2, '0')
  const utc = [
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`,
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`,
  ].join(' ')

  return { utc, iso: date.toISOString(), relative: formatRelative(date), ms }
}

function utcToEpoch(raw: string): { seconds: number; millis: number } | null {
  if (!raw.trim()) return null
  const date = new Date(raw.trim())
  if (isNaN(date.getTime())) return null
  const ms = date.getTime()
  return { seconds: Math.floor(ms / 1000), millis: ms }
}

function utcToPacific(raw: string): { pacific: string; abbr: string } | null {
  if (!raw.trim()) return null
  const date = new Date(raw.trim())
  if (isNaN(date.getTime())) return null

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
    timeZoneName: 'short',
  })

  const parts = fmt.formatToParts(date)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const pacific = `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`
  const abbr = get('timeZoneName')
  return { pacific, abbr }
}

function kstToUtc(raw: string): { utc: string; iso: string; seconds: number; millis: number } | null {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Accept "YYYY-MM-DD HH:MM:SS" or ISO-like; treat input as KST (UTC+9)
  const normalized = trimmed.replace(' ', 'T')
  const withOffset = normalized.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(normalized)
    ? normalized
    : normalized + '+09:00'

  const date = new Date(withOffset)
  if (isNaN(date.getTime())) return null

  const ms = date.getTime()
  const pad = (v: number) => String(v).padStart(2, '0')
  const utc = `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`

  return { utc, iso: date.toISOString(), seconds: Math.floor(ms / 1000), millis: ms }
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <button className="epoch-copy-btn" onClick={copy} title="copy">
      {copied ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
      )}
    </button>
  )
}

function OutputRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="kp-output-row">
      <div className="key">{label}</div>
      <div className="val epoch-val-row">
        <span>{value}</span>
        <CopyButton text={value} />
      </div>
    </div>
  )
}

export default function EpochCalc() {
  const [epochInput, setEpochInput] = useState('')
  const [utcInput, setUtcInput] = useState('')
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const [pacificInput, setPacificInput] = useState('')
  const [kstInput, setKstInput] = useState('')

  const epochResult = epochToUtc(epochInput)
  const utcResult = utcToEpoch(utcInput)
  const pacificResult = utcToPacific(pacificInput)
  const kstResult = kstToUtc(kstInput)

  const currentEpoch = Math.floor(now / 1000)

  return (
    <div className="epoch-root">
      {/* Live clock strip */}
      <div className="epoch-now-bar">
        <span className="epoch-now-label">now</span>
        <span className="epoch-now-val">{currentEpoch}</span>
        <CopyButton text={String(currentEpoch)} />
      </div>

      <div className="epoch-sections">
        {/* Epoch → UTC */}
        <div className="kp-card">
          <div className="epoch-section-label">epoch → UTC</div>
          <div className="kp-input-row">
            <input
              type="text"
              inputMode="numeric"
              value={epochInput}
              onChange={e => setEpochInput(e.target.value)}
              placeholder="1700000000 or 1700000000000"
              className="kp-input"
            />
          </div>

          {epochInput && !epochResult && (
            <p className="kp-error">invalid epoch value</p>
          )}

          {epochResult ? (
            <div className="kp-output">
              <OutputRow label="UTC" value={epochResult.utc} />
              <OutputRow label="ISO" value={epochResult.iso} />
              <OutputRow label="relative" value={epochResult.relative} />
              <div className="kp-output-divider" />
              <OutputRow label="seconds" value={String(Math.floor(epochResult.ms / 1000))} />
              <OutputRow label="millis" value={String(epochResult.ms)} />
            </div>
          ) : (
            <p className="kp-empty">enter an epoch timestamp</p>
          )}
        </div>

        {/* UTC → Epoch */}
        <div className="kp-card">
          <div className="epoch-section-label">UTC → epoch</div>
          <div className="kp-input-row">
            <input
              type="text"
              value={utcInput}
              onChange={e => setUtcInput(e.target.value)}
              placeholder="2024-11-14T12:00:00Z"
              className={'kp-input' + (utcInput && !utcResult ? ' kp-input-error' : '')}
            />
          </div>

          {utcInput && !utcResult && (
            <p className="kp-error">invalid UTC date — try 2024-11-14T12:00:00Z</p>
          )}

          {utcResult ? (
            <div className="kp-output">
              <OutputRow label="seconds" value={String(utcResult.seconds)} />
              <OutputRow label="millis" value={String(utcResult.millis)} />
            </div>
          ) : (
            <p className="kp-empty">enter a UTC datetime string</p>
          )}
        </div>

        {/* UTC → PDT/PST */}
        <div className="kp-card">
          <div className="epoch-section-label">UTC → PDT / PST</div>
          <div className="kp-input-row">
            <input
              type="text"
              value={pacificInput}
              onChange={e => setPacificInput(e.target.value)}
              placeholder="2024-11-14T12:00:00Z"
              className={'kp-input' + (pacificInput && !pacificResult ? ' kp-input-error' : '')}
            />
          </div>

          {pacificInput && !pacificResult && (
            <p className="kp-error">invalid UTC date — try 2024-11-14T12:00:00Z</p>
          )}

          {pacificResult ? (
            <div className="kp-output">
              <OutputRow label={pacificResult.abbr} value={pacificResult.pacific} />
            </div>
          ) : (
            <p className="kp-empty">enter a UTC datetime string</p>
          )}
        </div>

        {/* KST → UTC */}
        <div className="kp-card">
          <div className="epoch-section-label">KST → UTC</div>
          <div className="kp-input-row">
            <input
              type="text"
              value={kstInput}
              onChange={e => setKstInput(e.target.value)}
              placeholder="2024-11-14 21:00:00"
              className={'kp-input' + (kstInput && !kstResult ? ' kp-input-error' : '')}
            />
          </div>

          {kstInput && !kstResult && (
            <p className="kp-error">invalid KST date — try 2024-11-14 21:00:00</p>
          )}

          {kstResult ? (
            <div className="kp-output">
              <OutputRow label="UTC" value={kstResult.utc} />
              <OutputRow label="ISO" value={kstResult.iso} />
              <div className="kp-output-divider" />
              <OutputRow label="seconds" value={String(kstResult.seconds)} />
              <OutputRow label="millis" value={String(kstResult.millis)} />
            </div>
          ) : (
            <p className="kp-empty">enter a KST datetime string</p>
          )}
        </div>
      </div>
    </div>
  )
}
