import express from 'express'
import { resolve4, resolve6, resolveMx, resolveCname } from 'dns/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { whoisDomain } from 'whoiser'
import net from 'net'
import tls from 'tls'
import Dns2 from 'dns2'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

const sendUmamiEvent = (name) => {
  const url = process.env.UMAMI_URL
  const websiteId = process.env.UMAMI_WEBSITE_ID
  if (!url || !websiteId) return
  fetch(`${url}/api/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: JSON.stringify({
      type: 'event',
      payload: { website: websiteId, hostname: 'kevinprk.com', language: 'en', url: '/events', name },
    }),
  }).catch(() => {})
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.socket.remoteAddress || 'unknown'
}

function isCurlRequest(req) {
  return (req.headers['user-agent'] || '').toLowerCase().startsWith('curl')
}

// Root: curl → plain text IP, browser on HTTP → HTTPS redirect, browser on HTTPS → SPA
app.get('/', (req, res) => {
  if (isCurlRequest(req)) {
    return res.type('text/plain').send(getClientIp(req) + '\n')
  }
  if (req.headers['x-forwarded-proto'] === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`)
  }
  res.sendFile(join(__dirname, '../dist/index.html'))
})

// API: IP
app.get('/api/ip', (req, res) => {
  res.json({ ip: getClientIp(req) })
})

// API: DNS lookup
app.get('/api/dns', async (req, res) => {
  const host = req.query.host?.trim()
  if (!host) return res.status(400).json({ error: 'host is required' })

  const records = {}
  const errors = {}

  await Promise.allSettled([
    resolve4(host).then(r => (records.A = r)).catch(e => (errors.A = e.code)),
    resolve6(host).then(r => (records.AAAA = r)).catch(e => (errors.AAAA = e.code)),
    resolveCname(host).then(r => (records.CNAME = r)).catch(e => (errors.CNAME = e.code)),
    resolveMx(host).then(r => (records.MX = r)).catch(e => (errors.MX = e.code)),
  ])

  const errorCodes = Object.values(errors)
  let rcode = 'NOERROR'
  if (errorCodes.some(c => c === 'ESERVFAIL')) rcode = 'SERVFAIL'
  else if (errorCodes.length === 4 && errorCodes.every(c => c === 'ENOTFOUND')) rcode = 'NXDOMAIN'

  sendUmamiEvent('dns_lookup')
  res.json({ host, records, errors, rcode })
})

// API: TLS checker
app.get('/api/tls', async (req, res) => {
  const host = req.query.host?.trim()
  const port = parseInt(req.query.port) || 443
  if (!host) return res.status(400).json({ error: 'host is required' })

  try {
    const result = await new Promise((resolve, reject) => {
      const socket = tls.connect({ host, port, servername: host, rejectUnauthorized: false }, () => {
        const cert = socket.getPeerCertificate(true)
        const proto = socket.getProtocol()
        const cipher = socket.getCipher()
        const authorized = socket.authorized

        if (!cert || !cert.subject) {
          socket.destroy()
          return reject(new Error('no certificate returned'))
        }

        const sans = cert.subjectaltname
          ? cert.subjectaltname.split(', ').map(s => s.replace(/^DNS:/, '').trim())
          : []

        const issuerO = cert.issuer?.O || cert.issuer?.CN || null
        const subjectCN = cert.subject?.CN || null
        const validFrom = cert.valid_from ? new Date(cert.valid_from).toISOString() : null
        const validTo = cert.valid_to ? new Date(cert.valid_to).toISOString() : null
        const daysLeft = validTo
          ? Math.floor((new Date(validTo) - Date.now()) / 86_400_000)
          : null

        // detect self-signed: issuer matches subject
        const selfSigned = cert.issuer?.CN === cert.subject?.CN && cert.issuer?.O === cert.subject?.O

        socket.destroy()
        resolve({
          handshake: 'success',
          protocol: proto,
          cipher: cipher?.name || null,
          subject: subjectCN,
          issuer: issuerO,
          sans,
          validFrom,
          validTo,
          daysLeft,
          trusted: authorized ? 'trusted' : selfSigned ? 'self-signed' : 'untrusted',
        })
      })

      socket.setTimeout(8000, () => { socket.destroy(); reject(new Error('timeout')) })
      socket.on('error', err => reject(err))
    })

    sendUmamiEvent('tls_check')
    res.json(result)
  } catch (err) {
    res.json({
      handshake: 'failed',
      error: err.message,
    })
  }
})

// API: BGP / ASN lookup via Team Cymru whois
function cymruQuery(ip) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(43, 'whois.cymru.com')
    let buf = ''
    const timer = setTimeout(() => { socket.destroy(); reject(new Error('timeout')) }, 8000)

    socket.setEncoding('utf8')
    socket.on('connect', () => socket.write(`begin\nverbose\n${ip}\nend\n`))
    socket.on('data', chunk => { buf += chunk })
    socket.on('end', () => {
      clearTimeout(timer)
      // Response has a header line then data lines: "AS | IP | BGP Prefix | CC | Registry | Allocated | AS Name"
      const lines = buf.split('\n').map(l => l.trim()).filter(Boolean)
      const dataLine = lines.find(l => /^\d+\s*\|/.test(l))
      if (!dataLine) return reject(new Error('no data'))

      const parts = dataLine.split('|').map(p => p.trim())
      resolve({
        asn:       parts[0] ? `AS${parts[0]}` : null,
        ip:        parts[1] || null,
        prefix:    parts[2] || null,
        country:   parts[3] || null,
        registry:  parts[4] || null,
        allocated: parts[5] || null,
        asName:    parts[6] || null,
      })
    })
    socket.on('error', err => { clearTimeout(timer); reject(err) })
  })
}

app.get('/api/bgp', async (req, res) => {
  const ip = req.query.ip?.trim()
  if (!ip) return res.status(400).json({ error: 'ip is required' })

  try {
    const result = await cymruQuery(ip)
    sendUmamiEvent('bgp_lookup')
    res.json(result)
  } catch (err) {
    res.status(502).json({ error: 'BGP lookup failed', detail: err.message })
  }
})

// API: DNS propagation check
const RESOLVERS = [
  { name: 'Google',      ip: '8.8.8.8',          region: 'US' },
  { name: 'Cloudflare',  ip: '1.1.1.1',          region: 'Global' },
  { name: 'OpenDNS',     ip: '208.67.222.222',    region: 'US' },
  { name: 'Quad9',       ip: '9.9.9.9',           region: 'CH' },
  { name: 'Verisign',    ip: '64.6.64.6',         region: 'US' },
  { name: 'AdGuard',     ip: '94.140.14.14',      region: 'CY' },
  { name: 'Level3',      ip: '4.2.2.1',           region: 'US' },
  { name: 'Alibaba',     ip: '223.5.5.5',         region: 'CN' },
  { name: 'Baidu',       ip: '180.76.76.76',      region: 'CN' },
  { name: 'KT',          ip: '168.126.63.1',      region: 'KR' },
  { name: 'KDDI',        ip: '203.141.128.100',   region: 'JP' },
  { name: 'Telstra',     ip: '139.130.4.4',       region: 'AU' },
]

const SUPPORTED_TYPES = new Set(['A', 'AAAA', 'CNAME', 'MX', 'NS', 'TXT'])

async function queryResolver(host, type, resolverIp) {
  const dns = new Dns2({ nameServers: [resolverIp] })
  const result = await dns.resolve(host, type)
  const answers = result.answers || []

  return answers.map(a => {
    if (type === 'MX') return `${a.priority} ${a.exchange}`
    if (type === 'TXT') return Array.isArray(a.data) ? a.data.join('') : String(a.data)
    return a.address || a.data || a.domain || ''
  }).filter(Boolean).sort()
}

app.get('/api/propagation', async (req, res) => {
  const host = req.query.host?.trim()
  const type = (req.query.type || 'A').toUpperCase()

  if (!host) return res.status(400).json({ error: 'host is required' })
  if (!SUPPORTED_TYPES.has(type)) return res.status(400).json({ error: 'unsupported record type' })

  const results = await Promise.allSettled(
    RESOLVERS.map(r =>
      Promise.race([
        queryResolver(host, type, r.ip),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
      ]).then(values => ({ ...r, values, error: null }))
        .catch(err => ({ ...r, values: [], error: err.message === 'timeout' ? 'timeout' : 'error' }))
    )
  )

  sendUmamiEvent('propagation_check')
  res.json({
    host,
    type,
    results: results.map(r => r.value),
  })
})

// API: WHOIS lookup
app.get('/api/whois', async (req, res) => {
  const host = req.query.host?.trim()
  if (!host) return res.status(400).json({ error: 'host is required' })

  try {
    sendUmamiEvent('whois_lookup')
    const raw = await whoisDomain(host, { timeout: 8000, follow: 2 })

    // whoiser returns an object keyed by whois server; pick the first populated one
    const data = Object.values(raw).find(v => typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length > 1) || {}

    function pick(obj, keys) {
      for (const k of keys) {
        const val = obj[k]
        if (val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)) return val
      }
      return null
    }

    const rawStatus = pick(data, ['Domain Status', 'status', 'Status'])
    const statusList = (Array.isArray(rawStatus) ? rawStatus : rawStatus ? [rawStatus] : [])
      .map(s => s.split(' ')[0].trim())
      .filter(Boolean)

    const result = {
      status: statusList,
      registrar: pick(data, ['Registrar', 'registrar', 'Sponsoring Registrar']) || null,
      created:   pick(data, ['Creation Date', 'Created Date', 'created', 'Registration Time']) || null,
      expires:   pick(data, ['Registry Expiry Date', 'Expiry Date', 'expires', 'Expiration Time', 'Registrar Registration Expiration Date']) || null,
      registrant: pick(data, ['Registrant Organization', 'Registrant Name', 'registrant', 'Registrant']) || null,
    }

    res.json(result)
  } catch (err) {
    res.status(502).json({ error: 'whois lookup failed', detail: err.message })
  }
})

// Static assets
app.use(express.static(join(__dirname, '../dist')))

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => console.log(`plumber listening on :${PORT}`))
