# plumber

Network toolbox — a collection of utilities for inspecting and debugging networks.

**Live:** https://plumber.kevinprk.com

## Tools

| Tool | Description |
|---|---|
| **IP Check** | Identify your public IP address and geolocation |
| **DNS Lookup** | Query DNS records (A, AAAA, MX, TXT, NS, CNAME) for any domain |
| **DNS Propagation** | Check DNS record propagation across global resolvers |
| **BGP Lookup** | Inspect BGP routing info, ASN details, and prefix announcements |
| **CIDR Calculator** | Break down any CIDR block into network/broadcast/host ranges |
| **TLS Checker** | Inspect TLS certificate details and expiry for any domain |
| **Epoch Calculator** | Convert between Unix timestamps and human-readable dates |

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + React + TypeScript |
| Backend | Node.js + Express |
| DNS | dns2 |
| WHOIS | whoiser |
| Serving | Nginx (static) + Express API |
| Deploy | Docker + Kubernetes (ArgoCD) |
| CI | GitHub Actions |

## Project Structure

```
plumber/
├── src/
│   ├── App.tsx
│   ├── index.css
│   └── components/
│       ├── BgpLookup.tsx
│       ├── CidrCalc.tsx
│       ├── DnsLookup.tsx
│       ├── EpochCalc.tsx
│       ├── IpCheck.tsx
│       ├── Propagation.tsx
│       └── TlsChecker.tsx
├── server/
│   └── index.js            # Express API (DNS, WHOIS, BGP proxying)
├── public/
├── index.html
├── vite.config.ts
└── Dockerfile
```

## Local Setup

```bash
npm install

# frontend dev server
npm run dev:client          # http://localhost:5173

# backend API
npm run dev:server          # http://localhost:3000
```

Or run with Docker:

```bash
docker build -t plumber .
docker run -p 8080:80 plumber
# open http://localhost:8080
```

## CI/CD

Push to `main` → GitHub Actions builds `krapi0314/plumber:<sha>` and pushes to Docker Hub → updates `k8s/plumber/deployment.yaml` in [krapie/homeserver](https://github.com/krapie/homeserver) → ArgoCD syncs to the cluster.
