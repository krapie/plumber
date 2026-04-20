import express from 'express'
import { resolve4, resolve6, resolveMx, resolveCname } from 'dns/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

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

// Static assets
app.use(express.static(join(__dirname, '../dist')))

// SPA fallback
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => console.log(`plumber listening on :${PORT}`))
