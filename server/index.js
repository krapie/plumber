import express from 'express'
import { resolve4, resolve6, resolveMx, resolveCname } from 'dns/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import whoiser from 'whoiser'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

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

  res.json({ host, records, errors })
})

// API: WHOIS lookup
app.get('/api/whois', async (req, res) => {
  const host = req.query.host?.trim()
  if (!host) return res.status(400).json({ error: 'host is required' })

  try {
    const raw = await whoiser(host, { timeout: 8000, follow: 2 })

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
