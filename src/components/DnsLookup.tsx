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
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
        DNS Lookup
      </h2>

      <form onSubmit={lookup} className="flex gap-2">
        <input
          type="text"
          value={host}
          onChange={e => setHost(e.target.value)}
          placeholder="example.com"
          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 font-mono"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-sm font-medium transition-colors"
        >
          {loading ? '...' : 'Lookup'}
        </button>
      </form>

      {error && (
        <p className="mt-4 text-red-400 text-sm">{error}</p>
      )}

      {result && records.length === 0 && (
        <p className="mt-4 text-slate-500 text-sm">No records found for {result.host}</p>
      )}

      {records.length > 0 && (
        <div className="mt-4 space-y-3">
          {records.map(r => (
            <div key={r.type}>
              <span className="text-xs font-semibold text-sky-500 uppercase tracking-wider">{r.type}</span>
              <div className="mt-1 space-y-1">
                {r.values.map((v, i) => (
                  <p key={i} className="font-mono text-sm text-slate-300 bg-slate-800 rounded px-3 py-1.5">
                    {v}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
