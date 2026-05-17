import { useState } from 'react'

type DnsRecord = { type: string; values: string[] }

interface DnsResult {
  host: string
  records: Record<string, unknown>
  errors: Record<string, string>
}

interface WhoisResult {
  status: string[]
  registrar: string | null
  created: string | null
  expires: string | null
  registrant: string | null
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

function formatDate(raw: string): string {
  const d = new Date(raw)
  if (isNaN(d.getTime())) return raw
  return d.toISOString().slice(0, 10)
}

export default function DnsLookup() {
  const [host, setHost] = useState('')
  const [result, setResult] = useState<DnsResult | null>(null)
  const [whois, setWhois] = useState<WhoisResult | null>(null)
  const [whoisLoading, setWhoisLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    const q = host.trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setResult(null)
    setWhois(null)
    setWhoisLoading(true)

    const [dnsRes, whoisRes] = await Promise.allSettled([
      fetch(`/api/dns?host=${encodeURIComponent(q)}`),
      fetch(`/api/whois?host=${encodeURIComponent(q)}`),
    ])

    setLoading(false)

    if (dnsRes.status === 'fulfilled') {
      const r = dnsRes.value
      try {
        const data = await r.json()
        if (!r.ok) setError(data.error || 'Lookup failed')
        else setResult(data)
      } catch {
        setError('Lookup failed')
      }
    } else {
      setError('Lookup failed')
    }

    if (whoisRes.status === 'fulfilled') {
      try {
        const data = await whoisRes.value.json()
        if (whoisRes.value.ok) setWhois(data)
      } catch { /* silently ignore */ }
    }
    setWhoisLoading(false)
  }

  const records = result ? parseRecords(result) : []
  const hasWhois = whois && (
    whois.status.length > 0 || whois.registrar || whois.created || whois.expires || whois.registrant
  )

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
              <span className="kp-badge"><span className="dot" />NoError</span>
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

          {/* WHOIS section */}
          {(whoisLoading || hasWhois) && (
            <>
              <div className="kp-output-divider" style={{ marginTop: 'var(--kp-space-2)' }} />
              <div className="whois-heading">whois</div>
            </>
          )}

          {whoisLoading && (
            <div className="kp-output-row">
              <div className="key" />
              <div className="val" style={{ color: 'var(--kp-fg-4)' }}>fetching…</div>
            </div>
          )}

          {!whoisLoading && hasWhois && (
            <>
              {whois!.status.length > 0 && (
                <div className="kp-output-row">
                  <div className="key">epp</div>
                  <div className="val whois-status-list">
                    {whois!.status.map(s => (
                      <span key={s} className="whois-status-tag">{s}</span>
                    ))}
                  </div>
                </div>
              )}
              {whois!.registrar && (
                <div className="kp-output-row">
                  <div className="key">registrar</div>
                  <div className="val">{whois!.registrar}</div>
                </div>
              )}
              {whois!.registrant && (
                <div className="kp-output-row">
                  <div className="key">registrant</div>
                  <div className="val">{whois!.registrant}</div>
                </div>
              )}
              {whois!.created && (
                <div className="kp-output-row">
                  <div className="key">created</div>
                  <div className="val">{formatDate(whois!.created)}</div>
                </div>
              )}
              {whois!.expires && (
                <div className="kp-output-row">
                  <div className="key">expires</div>
                  <div className="val">{formatDate(whois!.expires)}</div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {!result && !loading && !error && (
        <p className="kp-empty">enter a domain to look up</p>
      )}
    </div>
  )
}
