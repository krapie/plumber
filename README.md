# plumber

plumber is a simple web-based toolkit for performing common networking checks and diagnostics in one place.

## Quick start

1. Install dependencies (Node.js 18+ recommended):

   ```bash
   npm install
   ```

2. Launch the Vite dev server:

   ```bash
   npm run dev
   ```

3. Open the printed URL (default `http://localhost:5173`) to explore the tools.

To produce an optimized build:

```bash
npm run build
npm run preview
```

### Deploying to GitHub Pages

This repository ships with a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds the Vite site and publishes the contents of `dist/` to GitHub Pages. Push to `main` (or trigger the workflow manually) to update the hosted site.

The workflow sets `GITHUB_PAGES=true` during the build so Vite emits assets with the `/plumber/` base path required for Pages. If you run `npm run build` locally for Pages, export the same variable first:

```bash
GITHUB_PAGES=true npm run build
```

## Architecture highlights

- **React UI shell (with TypeScript)** – Manages layout, state, and the tabbed experience for networking utilities.
- **Browser-native APIs** – Public IP and DNS lookups query trusted third-party endpoints directly from the browser, avoiding any custom backend.
- **Vite toolchain** – Provides fast iteration now and a path to future TypeScript- or test-oriented integrations.
- **Adaptive theming** – Automatic dark mode support follows the user’s OS preference without extra configuration.

## Available features

- **IP insights** – Fetches your current public IPv4 address from trusted external services.
- **CIDR utilities** – Calculates network, broadcast, usable ranges, and host counts for IPv4 CIDRs, and checks whether a given IP resides within the specified block.
- **DNS lookups (beta)** – Retrieves DNS record values for common record types, aggregates duplicate answers, surfaces WHOIS snapshots, and scaffolds global propagation tracking with an interactive world map.

## Roadmap

- Additional DNS diagnostics (propagation timings, provider comparisons, DNSSEC).
- ASN and BGP ownership lookups.
- Connectivity probes (ping, curl, traceroute, MTR, iperf) with progressive enhancement for browsers/workers that can support them.

## Contributing

Ideas and pull requests are welcome as the TypeScript experience takes shape. Open an issue to discuss new networking diagnostics or improvements to the existing flow.
