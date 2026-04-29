import { useState } from 'react'

type DnsRecord = { type: string; values: string[] }

interface DnsResult {
  host: string
  records: Record<string, unknown>
  errors: Record<string, string>
}

function parseRecords(result: DnsResult): DnsRecord[] {
  const out: DnsRecord[] = []
  const { records } = result

  if (Array.isArray(records.A) && records.A.length)
    out.push({ type: 'A', values: records.A as string[] })

  if (Array.isArray(records.AAAA) && records.AAAA.length)
    out.push({ type: 'AAAA', values: records.AAAA as string[] })

  if (Array.isArray(records.CNAME) && records.CNAME.length)
    out.push({ type: 'CNAME', values: records.CNAME as string[] })

  if (Array.isArray(records.MX) && records.MX.length) {
    const mx = (records.MX as { exchange: string; priority: number }[])
      .map(r => `${r.priority} ${r.exchange}`)
    out.push({ type: 'MX', values: mx })
  }

  return out
}

export default function DnsLookup() {
  const [host, setHost] = useState('')
  const [result, setResult] = useState<DnsResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    const q = host.trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/dns?host=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lookup failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed')
    } finally {
      setLoading(false)
    }
  }

  const records = result ? parseRecords(result) : []

  return (
    <div className="kp-card">
      <form onSubmit={lookup} className="kp-input-row">
        <input
          type="text"
          value={host}
          onChange={e => setHost(e.target.value)}
          placeholder="example.com"
          className="kp-input"
        />
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Looking up…' : 'Look up'}
        </button>
      </form>

      {error && <p className="kp-error">{error}</p>}

      {result && records.length === 0 && (
        <p className="kp-empty">no records found for {result.host}</p>
      )}

      {result && records.length > 0 && (
        <div className="kp-output">
          <div className="kp-output-row">
            <div className="key">domain</div>
            <div className="val">{result.host}</div>
          </div>
          <div className="kp-output-row">
            <div className="key">status</div>
            <div className="val">
              <span className="kp-badge"><span className="dot" />resolved</span>
            </div>
          </div>
          <div className="kp-output-divider" />
          {records.map(r => (
            r.values.map((v, i) => (
              <div className="kp-output-row" key={`${r.type}-${i}`}>
                <div className="key">{i === 0 ? r.type : ''}</div>
                <div className="val">{v}</div>
              </div>
            ))
          ))}
        </div>
      )}

      {!result && !loading && !error && (
        <p className="kp-empty">enter a domain to look up</p>
      )}
    </div>
  )
}
