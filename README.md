# plumber

Plumber is evolving into a TypeScript + React frontend paired with a lightweight Go server for gathering networking insights. The long-term goal is to surface IP intelligence, CIDR math, ownership discovery, and connectivity diagnostics from one cohesive toolbox.

## Quick start

1. Install frontend dependencies (Node.js 18+ recommended):

   ```bash
   npm install
   ```

2. Start the Go server in a separate terminal:

   ```bash
   cd ./server
   go run main.go
   ```

   The server listens on `:8080` by default. Set the `PORT` environment variable to override it.

3. With the server running, launch the Vite dev server:

   ```bash
   npm run dev
   ```

4. Open the printed URL (default `http://localhost:5173`). The Vite dev server proxies `/server/*` requests to the Go backend, so the browser and server stay in sync during development.

To produce an optimized frontend build:

```bash
npm run build
npm run preview
```

## Architecture highlights

- **React UI shell (with TypeScript)** – Manages layout, state, and future routing for the growing toolbox while keeping types front-and-center.
- **Go server gateway** – Exposes networking primitives starting with `/server/public-ip`, derived directly from the incoming request so no third-party IP service is required.
- **Vite toolchain** – Provides fast iteration now and a path to future TypeScript- or test-oriented integrations, with a built-in proxy for local server development.

## Available features

- **Public IP display** – Fetches your current public IPv4 address from the Go server, which inspects client headers (`X-Forwarded-For`, `X-Real-IP`, or `RemoteAddr`) and returns the determined address. If the server is unavailable, the frontend falls back to AWS’s `checkip.amazonaws.com`.
- **CIDR utilities** – Calculates network, broadcast, usable ranges, and host counts for IPv4 CIDRs, and checks whether a given IP resides within the specified block.

## Roadmap

- CIDR calculators and IP inclusion checks.
- ASN and BGP ownership lookups.
- DNS record inspection and propagation visibility.
- Connectivity probes (ping, curl, traceroute, MTR, iperf) with progressive enhancement for browsers/workers that can support them.

## Contributing

Ideas and pull requests are welcome as the TypeScript + Go experience takes shape. Open an issue to discuss new networking diagnostics or improvements to the existing flow.
