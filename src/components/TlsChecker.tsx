import { useState } from 'react'

interface TlsResult {
  handshake: 'success' | 'failed'
  error?: string
  protocol?: string
  cipher?: string
  subject?: string
  issuer?: string
  sans?: string[]
  validFrom?: string
  validTo?: string
  daysLeft?: number
  trusted?: string
}

function ExpiryLabel({ daysLeft }: { daysLeft: number }) {
  const suffix = `· ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
  if (daysLeft < 14) return <span className="tls-expiry-critical">{suffix}</span>
  if (daysLeft < 30) return <span className="tls-expiry-warn">{suffix}</span>
  return <span className="tls-expiry-ok">{suffix}</span>
}

function formatDate(iso: string) {
  return iso.slice(0, 10)
}

export default function TlsChecker() {
  const [host, setHost] = useState('')
  const [port, setPort] = useState('443')
  const [result, setResult] = useState<TlsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function check(e: React.FormEvent) {
    e.preventDefault()
    const q = host.trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const p = parseInt(port) || 443
      const res = await fetch(`/api/tls?host=${encodeURIComponent(q)}&port=${p}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'check failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'check failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="kp-card">
      <form onSubmit={check} className="kp-input-row">
        <input
          type="text"
          value={host}
          onChange={e => setHost(e.target.value)}
          placeholder="example.com"
          className="kp-input"
        />
        <input
          type="text"
          value={port}
          onChange={e => setPort(e.target.value)}
          className="kp-input tls-port-input"
          aria-label="port"
        />
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Checking…' : 'Check'}
        </button>
      </form>

      {error && <p className="kp-error">{error}</p>}

      {result && (
        <div className="kp-output">
          {/* Handshake */}
          <div className="kp-output-row">
            <div className="key">handshake</div>
            <div className="val">
              {result.handshake === 'success'
                ? <span className="kp-badge"><span className="dot" />success</span>
                : <span className="dns-rcode-error">failed</span>
              }
            </div>
          </div>

          {result.handshake === 'failed' && result.error && (
            <div className="kp-output-row">
              <div className="key">reason</div>
              <div className="val" style={{ color: 'var(--kp-fg-3)' }}>{result.error}</div>
            </div>
          )}

          {result.handshake === 'success' && (
            <>
              <div className="kp-output-row">
                <div className="key">protocol</div>
                <div className="val">{result.protocol}</div>
              </div>
              <div className="kp-output-row">
                <div className="key">cipher</div>
                <div className="val">{result.cipher}</div>
              </div>

              <div className="kp-output-divider" />

              {result.subject && (
                <div className="kp-output-row">
                  <div className="key">subject</div>
                  <div className="val">{result.subject}</div>
                </div>
              )}
              {result.issuer && (
                <div className="kp-output-row">
                  <div className="key">issuer</div>
                  <div className="val">{result.issuer}</div>
                </div>
              )}
              {result.trusted && (
                <div className="kp-output-row">
                  <div className="key">trusted</div>
                  <div className="val">{result.trusted}</div>
                </div>
              )}

              <div className="kp-output-divider" />

              {result.validFrom && (
                <div className="kp-output-row">
                  <div className="key">valid from</div>
                  <div className="val">{formatDate(result.validFrom)}</div>
                </div>
              )}
              {result.validTo && (
                <div className="kp-output-row">
                  <div className="key">expires</div>
                  <div className="val tls-expiry-row">
                    <span>{formatDate(result.validTo)}</span>
                    {result.daysLeft !== undefined && <ExpiryLabel daysLeft={result.daysLeft} />}
                  </div>
                </div>
              )}

              {result.sans && result.sans.length > 0 && (
                <div className="kp-output-row">
                  <div className="key">SANs</div>
                  <div className="val tls-sans">
                    {result.sans.map(s => (
                      <span key={s} className="tls-san-tag">{s}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <p className="kp-empty">enter a hostname to check its TLS certificate</p>
      )}
    </div>
  )
}
