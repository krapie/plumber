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
    <div className="kp-card">
      {error ? (
        <p className="kp-error">failed to fetch IP address</p>
      ) : ip === null ? (
        <div className="kp-skeleton" />
      ) : (
        <div className="kp-output">
          <div className="kp-output-row">
            <div className="key">address</div>
            <div className="val kp-ip-value" style={{ fontSize: 'var(--kp-text-md)' }}>{ip}</div>
          </div>
        </div>
      )}
      {ip && (
        <button className="btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
    </div>
  )
}
