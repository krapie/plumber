import { useState, lazy, Suspense } from 'react'
import type { MapPoint } from './WorldMap'

const WorldMap = lazy(() => import('./WorldMap'))

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT']

interface ResolverResult {
  name: string
  ip: string
  region: string
  lat: number
  lon: number
  values: string[]
  error: string | null
}

interface PropResult {
  host: string
  type: string
  results: ResolverResult[]
}

export default function Propagation() {
  const [host, setHost] = useState('')
  const [type, setType] = useState('A')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PropResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function check(e: React.FormEvent) {
    e.preventDefault()
    const q = host.trim()
    if (!q) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch(`/api/propagation?host=${encodeURIComponent(q)}&type=${type}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'check failed')
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'check failed')
    } finally {
      setLoading(false)
    }
  }

  // Canonical answer = most common non-empty result
  const canonical = (() => {
    if (!result) return null
    const freq: Record<string, number> = {}
    for (const r of result.results) {
      if (r.values.length > 0) {
        const key = r.values.join('|')
        freq[key] = (freq[key] || 0) + 1
      }
    }
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]
    return top ? top[0] : null
  })()

  const propagated = result ? result.results.filter(r => r.values.length > 0 && r.values.join('|') === canonical).length : 0
  const total = result ? result.results.length : 0

  const points: MapPoint[] = result ? result.results.map(r => {
    const hasData = r.values.length > 0
    const status = r.error ? 'error' as const
      : !hasData ? 'nodata' as const
      : r.values.join('|') === canonical ? 'match' as const
      : 'diff' as const
    return { ...r, status }
  }) : []

  return (
    <div className="kp-card prop-card">
      <form onSubmit={check} className="kp-input-row">
        <input
          type="text"
          value={host}
          onChange={e => setHost(e.target.value)}
          placeholder="example.com"
          className="kp-input"
        />
        <div className="prop-type-select-wrap">
          <select
            value={type}
            onChange={e => setType(e.target.value)}
            className="kp-input prop-type-select"
          >
            {RECORD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Checking…' : 'Check'}
        </button>
      </form>

      {error && <p className="kp-error">{error}</p>}

      {loading && (
        <div className="prop-loading">
          <div className="prop-loading-bar" />
          <span>querying {total || 12} resolvers…</span>
        </div>
      )}

      {result && (
        <>
          <div className="prop-summary">
            <span className="prop-summary-count">{propagated}/{total}</span>
            <span className="prop-summary-label">resolvers agree</span>
            {canonical && (
              <code className="prop-summary-value">{canonical.split('|').join(', ')}</code>
            )}
          </div>

          <Suspense fallback={<p className="kp-empty">loading map…</p>}>
            <WorldMap points={points} />
          </Suspense>
        </>
      )}

      {!result && !loading && !error && (
        <p className="kp-empty">enter a domain to check propagation</p>
      )}
    </div>
  )
}
