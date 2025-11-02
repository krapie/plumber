import type { ReactElement } from "react";
import { usePublicIp } from "./hooks/usePublicIp";

function Roadmap(): ReactElement {
  return (
    <section className="roadmap card" aria-labelledby="roadmap-title">
      <h2 id="roadmap-title">Coming Soon</h2>
      <ul>
        <li>CIDR calculators and IP inclusion checks.</li>
        <li>Ownership lookups (WHOIS, BGP ASN).</li>
        <li>DNS record inspection and propagation tracking.</li>
        <li>Connectivity diagnostics (ping, curl, traceroute, MTR, iperf).</li>
      </ul>
    </section>
  );
}

export default function App(): ReactElement {
  const { ip, loading, error, refresh } = usePublicIp();

  return (
    <>
      <header className="site-header">
        <div className="container">
          <h1>Plumber</h1>
          <p className="tagline">
            A simple web-based toolkit for performing common networking checks and diagnostics in one place.
          </p>
        </div>
      </header>

      <main className="container">
        <section className="card" aria-labelledby="public-ip-title">
          <div className="card-header">
            <h2 id="public-ip-title">Your Public IP</h2>
            <button
              type="button"
              className="primary-btn"
              onClick={() => {
                void refresh();
              }}
              disabled={loading}
            >
              {loading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="card-body">
            <p className="ip-reading" aria-live="polite" aria-busy={loading}>
              {loading ? "Loading..." : ip || "Unavailable"}
            </p>
            <p className="ip-source">
              Primary lookup comes from the Plumber server. If it is unavailable, the UI falls back
              to AWS&apos;s checkip service.
            </p>
            {error && (
              <p className="error-message" role="alert">
                {error}
              </p>
            )}
          </div>
        </section>

        <Roadmap />
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>Built with care for quick networking sanity checks.</p>
        </div>
      </footer>
    </>
  );
}
