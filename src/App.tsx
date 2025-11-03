import { useCallback, useEffect, useState, type FormEvent, type ReactElement } from "react";
import { usePublicIp } from "./hooks/usePublicIp";
import { CidrTool } from "./components/CidrTool";
import { DnsTool } from "./components/DnsTool";
import { useTheme, type ThemePreference } from "./hooks/useTheme";
import { fetchIpWhois, type WhoisIpSummary } from "./utils/whois";

type TabKey = "ip" | "cidr" | "dns";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "ip", label: "IP" },
  { key: "cidr", label: "CIDR" },
  { key: "dns", label: "DNS" },
];

function IpPanel(): JSX.Element {
  const { ip, loading, error, refresh } = usePublicIp();
  const [whoisInput, setWhoisInput] = useState<string>("");
  const [whois, setWhois] = useState<WhoisIpSummary | null>(null);
  const [whoisLoading, setWhoisLoading] = useState<boolean>(false);
  const [whoisError, setWhoisError] = useState<string>("");

  const performWhoisLookup = useCallback(
    async (targetIp: string) => {
      const trimmed = targetIp.trim();
      if (!trimmed) {
        setWhoisError("Enter an IP address to look up.");
        setWhois(null);
        return;
      }

      setWhoisLoading(true);
      setWhoisError("");
      setWhois(null);

      try {
        const summary = await fetchIpWhois(trimmed);
        setWhois(summary);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unable to retrieve WHOIS details for this IP.";
        setWhoisError(message);
      } finally {
        setWhoisLoading(false);
      }
    },
    [setWhois, setWhoisError, setWhoisLoading],
  );

  useEffect(() => {
    if (ip && !whoisInput) {
      setWhoisInput(ip);
      setWhois(null);
      setWhoisError("");
    }
  }, [ip, whoisInput]);

  const handleWhoisSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void performWhoisLookup(whoisInput);
    },
    [performWhoisLookup, whoisInput],
  );

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
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        <section className="whois-card">
          <header>
            <h3>WHOIS lookup</h3>
            <p>Inspect allocation details for any IPv4/IPv6 address.</p>
          </header>
          <form className="whois-card-form" onSubmit={handleWhoisSubmit}>
            <label className="input-block">
              <span className="input-label">IP address</span>
              <input
                type="text"
                value={whoisInput}
                onChange={(event) => setWhoisInput(event.target.value)}
                placeholder="e.g. 8.8.8.8"
              />
            </label>
            <button type="submit" className="primary-btn" disabled={whoisLoading}>
              {whoisLoading ? "Looking up..." : "Lookup WHOIS"}
            </button>
          </form>
          {whoisError && !whoisLoading && (
            <p className="whois-card-status whois-card-status--error">{whoisError}</p>
          )}
          {!whoisError && whoisLoading && <p className="whois-card-status">Loading WHOIS details…</p>}
          {whois && !whoisLoading && (
            <dl className="whois-card-details">
              <div>
                <dt>Network</dt>
                <dd>{whois.networkName ?? "—"}</dd>
              </div>
              <div>
                <dt>Handle</dt>
                <dd>{whois.handle ?? "—"}</dd>
              </div>
              <div>
                <dt>Organization</dt>
                <dd>{whois.org ?? "—"}</dd>
              </div>
              <div>
                <dt>Country</dt>
                <dd>{whois.country ?? "—"}</dd>
              </div>
              <div>
                <dt>Address range</dt>
                <dd>
                  {whois.startAddress ?? "—"} – {whois.endAddress ?? "—"}
                </dd>
              </div>
              <div>
                <dt>IP version</dt>
                <dd>{whois.ipVersion ?? "—"}</dd>
              </div>
            </dl>
          )}
        </section>
      </div>
    </section>
  );
}

function Roadmap(): ReactElement {
  return (
    <section className="roadmap card" aria-labelledby="roadmap-title">
      <h2 id="roadmap-title">Coming Soon</h2>
      <ul>
        <li>IPv6 CIDR and subnetting helpers.</li>
        <li>Ownership lookups (WHOIS, BGP ASN).</li>
        <li>Live DNS propagation checks and provider comparisons.</li>
        <li>Connectivity diagnostics (ping, curl, traceroute, MTR, iperf).</li>
      </ul>
    </section>
  );
}

export default function App(): ReactElement {
  const [activeTab, setActiveTab] = useState<TabKey>("ip");
  const [theme, setTheme] = useTheme();

  return (
    <>
      <header className="site-header">
        <div className="container header-flex">
          <h1 className="brand-title">Plumber</h1>
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
          <label className="theme-select" aria-label="Theme">
            <select
              value={theme}
              onChange={(event) => setTheme(event.target.value as ThemePreference)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </div>
      </header>

      <main className="container">
        {activeTab === "ip" && <IpPanel />}
        {activeTab === "cidr" && <CidrTool />}
        {activeTab === "dns" && <DnsTool />}

        <Roadmap />
      </main>

      <footer className="site-footer">
        <div className="container">
          <p>
            GitHub{" "}
            <a href="https://github.com/krapie" target="_blank" rel="noopener noreferrer">
              @krapie
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}
