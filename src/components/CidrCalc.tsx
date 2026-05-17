import { useState } from 'react'

function ipToInt(ip: string): number | null {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return null
  let n = 0
  for (const p of parts) {
    const v = parseInt(p, 10)
    if (isNaN(v) || v < 0 || v > 255) return null
    n = (n << 8) | v
  }
  return n >>> 0
}

function intToIp(n: number): string {
  return [24, 16, 8, 0].map(shift => (n >>> shift) & 0xff).join('.')
}

function parseCidr(cidr: string): { network: number; prefix: number } | null {
  const [ipPart, prefixPart] = cidr.trim().split('/')
  if (!prefixPart) return null
  const prefix = parseInt(prefixPart, 10)
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null
  const ip = ipToInt(ipPart)
  if (ip === null) return null
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const network = (ip & mask) >>> 0
  return { network, prefix }
}

interface CidrInfo {
  contains: boolean
  network: string
  broadcast: string
  first: string
  last: string
  mask: string
  hosts: number
  prefix: number
}

function calcCidr(ipStr: string, cidrStr: string): CidrInfo | null {
  const parsed = parseCidr(cidrStr)
  if (!parsed) return null
  const ip = ipToInt(ipStr)
  if (ip === null) return null

  const { network, prefix } = parsed
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const broadcast = (network | ~mask) >>> 0
  const hosts = prefix >= 31 ? Math.pow(2, 32 - prefix) : Math.pow(2, 32 - prefix) - 2
  const first = prefix >= 31 ? network : network + 1
  const last = prefix >= 31 ? broadcast : broadcast - 1

  return {
    contains: (ip & mask) >>> 0 === network,
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    first: intToIp(first),
    last: intToIp(last),
    mask: intToIp(mask),
    hosts: Math.max(0, hosts),
    prefix,
  }
}

function isValidIp(s: string) {
  return ipToInt(s) !== null
}

function isValidCidr(s: string) {
  return parseCidr(s) !== null
}

export default function CidrCalc() {
  const [ip, setIp] = useState('')
  const [cidr, setCidr] = useState('')

  const ipOk = ip === '' || isValidIp(ip)
  const cidrOk = cidr === '' || isValidCidr(cidr)
  const result = ip && cidr && ipOk && cidrOk ? calcCidr(ip, cidr) : null

  return (
    <div className="kp-card">
      <div className="kp-input-row">
        <input
          type="text"
          value={ip}
          onChange={e => setIp(e.target.value)}
          placeholder="192.168.1.50"
          className={'kp-input' + (!ipOk ? ' kp-input-error' : '')}
          aria-label="IP address"
        />
        <input
          type="text"
          value={cidr}
          onChange={e => setCidr(e.target.value)}
          placeholder="192.168.0.0/16"
          className={'kp-input' + (!cidrOk ? ' kp-input-error' : '')}
          aria-label="CIDR block"
        />
      </div>

      {(!ipOk || !cidrOk) && (
        <p className="kp-error">
          {!ipOk ? 'invalid IP address' : 'invalid CIDR block'}
        </p>
      )}

      {result ? (
        <div className="kp-output">
          <div className="kp-output-row">
            <div className="key">contains</div>
            <div className="val">
              {result.contains
                ? <span className="kp-badge"><span className="dot" />yes</span>
                : <span className="cidr-no">no</span>}
            </div>
          </div>
          <div className="kp-output-divider" />
          <div className="kp-output-row">
            <div className="key">network</div>
            <div className="val">{result.network}/{result.prefix}</div>
          </div>
          <div className="kp-output-row">
            <div className="key">mask</div>
            <div className="val">{result.mask}</div>
          </div>
          <div className="kp-output-row">
            <div className="key">range</div>
            <div className="val">{result.first} – {result.last}</div>
          </div>
          <div className="kp-output-row">
            <div className="key">broadcast</div>
            <div className="val">{result.broadcast}</div>
          </div>
          <div className="kp-output-row">
            <div className="key">hosts</div>
            <div className="val">{result.hosts.toLocaleString()}</div>
          </div>
        </div>
      ) : (
        <p className="kp-empty">enter an IP and a CIDR block</p>
      )}
    </div>
  )
}
