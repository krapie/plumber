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

interface ParsedCidr {
  network: number
  broadcast: number
  mask: number
  prefix: number
}

function parseCidr(cidr: string): ParsedCidr | null {
  const [ipPart, prefixPart] = cidr.trim().split('/')
  if (!prefixPart) return null
  const prefix = parseInt(prefixPart, 10)
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null
  const ip = ipToInt(ipPart)
  if (ip === null) return null
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0
  const network = (ip & mask) >>> 0
  const broadcast = (network | ~mask) >>> 0
  return { network, broadcast, mask, prefix }
}

function isValidIp(s: string) {
  return ipToInt(s) !== null
}

function isValidCidr(s: string) {
  return parseCidr(s) !== null
}

function cidrsOverlap(a: ParsedCidr, b: ParsedCidr): boolean {
  return a.network <= b.broadcast && b.network <= a.broadcast
}

export default function CidrCalc() {
  const [cidr1, setCidr1] = useState('')
  const [cidr2, setCidr2] = useState('')
  const [ip, setIp] = useState('')

  const cidr1Ok = cidr1 === '' || isValidCidr(cidr1)
  const cidr2Ok = cidr2 === '' || isValidCidr(cidr2)
  const ipOk = ip === '' || isValidIp(ip)

  const parsed1 = cidr1 && cidr1Ok ? parseCidr(cidr1) : null
  const parsed2 = cidr2 && cidr2Ok ? parseCidr(cidr2) : null

  const first = parsed1
    ? parsed1.prefix >= 31 ? parsed1.network : parsed1.network + 1
    : null
  const last = parsed1
    ? parsed1.prefix >= 31 ? parsed1.broadcast : parsed1.broadcast - 1
    : null
  const hosts = parsed1
    ? Math.max(0, parsed1.prefix >= 31
        ? Math.pow(2, 32 - parsed1.prefix)
        : Math.pow(2, 32 - parsed1.prefix) - 2)
    : null

  const ipInt = ip && ipOk ? ipToInt(ip) : null
  const containsResult = parsed1 && ipInt !== null
    ? (ipInt & parsed1.mask) >>> 0 === parsed1.network
    : null

  const overlapResult = parsed1 && parsed2 ? cidrsOverlap(parsed1, parsed2) : null

  const errorMsg = !cidr1Ok
    ? 'invalid CIDR block'
    : !cidr2Ok
    ? 'invalid second CIDR block'
    : !ipOk
    ? 'invalid IP address'
    : null

  return (
    <div className="kp-card">
      <div className="kp-input-row">
        <input
          type="text"
          value={cidr1}
          onChange={e => setCidr1(e.target.value)}
          placeholder="192.168.0.0/16"
          className={'kp-input' + (!cidr1Ok ? ' kp-input-error' : '')}
          aria-label="CIDR block"
        />
        <input
          type="text"
          value={cidr2}
          onChange={e => setCidr2(e.target.value)}
          placeholder="10.0.0.0/8  (compare)"
          className={'kp-input' + (!cidr2Ok ? ' kp-input-error' : '')}
          aria-label="Second CIDR block for overlap check"
        />
      </div>
      <div className="kp-input-row">
        <input
          type="text"
          value={ip}
          onChange={e => setIp(e.target.value)}
          placeholder="192.168.1.50  (optional)"
          className={'kp-input' + (!ipOk ? ' kp-input-error' : '')}
          aria-label="IP address"
        />
      </div>

      {errorMsg && <p className="kp-error">{errorMsg}</p>}

      {parsed1 ? (
        <div className="kp-output">
          {overlapResult !== null && (
            <>
              <div className="kp-output-row">
                <div className="key">overlap</div>
                <div className="val">
                  {overlapResult
                    ? <span className="kp-badge"><span className="dot" />yes</span>
                    : <span className="cidr-no">no</span>}
                </div>
              </div>
              <div className="kp-output-divider" />
            </>
          )}
          {containsResult !== null && (
            <>
              <div className="kp-output-row">
                <div className="key">contains</div>
                <div className="val">
                  {containsResult
                    ? <span className="kp-badge"><span className="dot" />yes</span>
                    : <span className="cidr-no">no</span>}
                </div>
              </div>
              <div className="kp-output-divider" />
            </>
          )}
          <div className="kp-output-row">
            <div className="key">network</div>
            <div className="val">{intToIp(parsed1.network)}/{parsed1.prefix}</div>
          </div>
          <div className="kp-output-row">
            <div className="key">mask</div>
            <div className="val">{intToIp(parsed1.mask)}</div>
          </div>
          <div className="kp-output-row">
            <div className="key">range</div>
            <div className="val">{intToIp(first!)} – {intToIp(last!)}</div>
          </div>
          <div className="kp-output-row">
            <div className="key">broadcast</div>
            <div className="val">{intToIp(parsed1.broadcast)}</div>
          </div>
          <div className="kp-output-row">
            <div className="key">hosts</div>
            <div className="val">{hosts!.toLocaleString()}</div>
          </div>
        </div>
      ) : (
        <p className="kp-empty">enter a CIDR block to see its range</p>
      )}
    </div>
  )
}
