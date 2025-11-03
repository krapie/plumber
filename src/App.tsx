import { useState, type ReactElement } from "react";
import { usePublicIp } from "./hooks/usePublicIp";
import { CidrTool } from "./components/CidrTool";

type TabKey = "ip" | "cidr";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "ip", label: "IP" },
  { key: "cidr", label: "CIDR" },
];

function IpPanel(): JSX.Element {
  const { ip, loading, error, refresh } = usePublicIp();

  return (
    <section className="card" aria-labelledby="ip-title">
      <div className="card-header">
        <h2 id="ip-title">Your IP</h2>
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
          Primary lookup comes from the Plumber server to report your public address. If it is
          unavailable, the UI falls back to AWS&apos;s checkip service.
        </p>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

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
  const [activeTab, setActiveTab] = useState<TabKey>("ip");

  return (
    <>
      <header className="site-header">
        <div className="container header-flex">
          <h1>Plumber</h1>
          <nav className="tab-nav" aria-label="Feature selection">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tab-button ${activeTab === tab.key ? "tab-button--active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
                aria-pressed={activeTab === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="container">
        {activeTab === "ip" && <IpPanel />}
        {activeTab === "cidr" && <CidrTool />}

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
