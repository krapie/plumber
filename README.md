# Plumber

Network toolbox for inspecting and debugging networks from the browser. All lookups go through a lightweight Node.js API that proxies to DNS resolvers, BGP data sources, and certificate endpoints so nothing is blocked by CORS. **Live:** [plumber.kevinprk.com](https://plumber.kevinprk.com)

## Getting Started

```bash
npm install
npm run dev:client   # frontend at localhost:5173
npm run dev:server   # API at localhost:3000
```

## Tools

- **IP Check** — identify your public IP address along with geolocation, ASN, and ISP details
- **DNS Lookup** — query A, AAAA, MX, TXT, NS, and CNAME records for any domain against multiple resolvers
- **DNS Propagation** — check whether a DNS record has propagated across global resolvers yet; useful right after a DNS change
- **BGP Lookup** — inspect BGP routing info for an IP or prefix: ASN, ASN name, announced prefixes, and upstream peers
- **CIDR Calculator** — break down any CIDR block into network address, broadcast address, subnet mask, and usable host range
- **TLS Checker** — fetch and display TLS certificate details for any domain: issuer, validity dates, SANs, and chain info
- **Epoch Calculator** — convert between Unix timestamps and human-readable dates in both directions
