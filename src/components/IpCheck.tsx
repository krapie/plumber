import { useEffect, useState } from 'react'

export default function IpCheck() {
  const [ip, setIp] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/ip')
      .then(r => r.json())
      .then(d => setIp(d.ip))
      .catch(() => setError(true))
  }, [])

  function copy() {
    if (!ip) return
    navigator.clipboard.writeText(ip)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-4">
        Your IP
      </h2>

      {error ? (
        <p className="text-red-400 text-sm">Failed to fetch IP</p>
      ) : ip === null ? (
        <div className="h-10 w-48 rounded bg-slate-800 animate-pulse" />
      ) : (
        <div className="flex items-center gap-4">
          <span className="text-3xl font-mono font-semibold text-sky-300">{ip}</span>
          <button
            onClick={copy}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-400 hover:border-sky-500 hover:text-sky-400 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      )}
    </section>
  )
}
