import { useState } from 'react'

interface BgpResult {
  asn: string | null
  ip: string | null
  prefix: string | null
  country: string | null
  registry: string | null
  allocated: string | null
  asName: string | null
}

export default function BgpLookup() {
  const [ip, setIp] = useState('')
  const [result, setResult] = useState<BgpResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    const q = ip.trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/bgp?ip=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'lookup failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'lookup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="kp-card">
      <form onSubmit={lookup} className="kp-input-row">
        <input
          type="text"
          value={ip}
          onChange={e => setIp(e.target.value)}
          placeholder="8.8.8.8 or 2001:4860:4860::8888"
          className="kp-input"
        />
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Looking up…' : 'Look up'}
        </button>
      </form>

      {error && <p className="kp-error">{error}</p>}

      {result && (
        <div className="kp-output">
          {result.asn && (
            <div className="kp-output-row">
              <div className="key">ASN</div>
              <div className="val" style={{ fontWeight: 'var(--kp-weight-semi)' as never }}>{result.asn}</div>
            </div>
          )}
          {result.asName && (
            <div className="kp-output-row">
              <div className="key">name</div>
              <div className="val">{result.asName}</div>
            </div>
          )}
          <div className="kp-output-divider" />
          {result.prefix && (
            <div className="kp-output-row">
              <div className="key">prefix</div>
              <div className="val">{result.prefix}</div>
            </div>
          )}
          {result.country && (
            <div className="kp-output-row">
              <div className="key">country</div>
              <div className="val">{result.country}</div>
            </div>
          )}
          {result.registry && (
            <div className="kp-output-row">
              <div className="key">registry</div>
              <div className="val">{result.registry}</div>
            </div>
          )}
          {result.allocated && (
            <div className="kp-output-row">
              <div className="key">allocated</div>
              <div className="val">{result.allocated}</div>
            </div>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <p className="kp-empty">enter an IP address to look up its BGP origin</p>
      )}
    </div>
  )
}
