import { useMemo, useState } from "react";
import {
  isIpInCidr,
  isValidIpv4,
  parseCidr,
  type ParsedCidr,
} from "../utils/ipv4";

type InclusionState = "inside" | "outside" | "unknown";

function getInclusionState(ip: string, cidr: string): InclusionState {
  if (!ip.trim() || !cidr.trim()) {
    return "unknown";
  }

  const result = isIpInCidr(ip, cidr);
  if (result === null) {
    return "unknown";
  }

  return result ? "inside" : "outside";
}

export function CidrTool(): JSX.Element {
  const [cidr, setCidr] = useState<string>("10.0.0.0/24");
  const [ip, setIp] = useState<string>("10.0.0.42");

  const parsedCidr = useMemo(() => parseCidr(cidr), [cidr]);
  const inclusionState = useMemo(() => getInclusionState(ip, cidr), [ip, cidr]);
  const cidrIsValid = Boolean(parsedCidr);
  const ipIsValid = ip.trim() === "" || isValidIpv4(ip.trim());

  return (
    <section className="card">
      <header className="card-header">
        <h2 className="card-title">Is the IP address within the CIDR block?</h2>
      </header>

      <div className="card-body column-gap">
        <div className="input-grid">
          <label className="input-block">
            <span className="input-label">CIDR Range</span>
            <input
              type="text"
              value={cidr}
              onChange={(event) => setCidr(event.target.value)}
              placeholder="e.g. 192.168.0.0/24"
              className={cidrIsValid ? "" : "input-error"}
              aria-invalid={!cidrIsValid}
            />
            {!cidrIsValid && (
              <span className="input-hint" role="alert">
                Enter a valid IPv4 CIDR (example: 172.16.0.0/16).
              </span>
            )}
          </label>

          <label className="input-block">
            <span className="input-label">IPv4 Address</span>
            <input
              type="text"
              value={ip}
              onChange={(event) => setIp(event.target.value)}
              placeholder="e.g. 192.168.0.42"
              className={ipIsValid ? "" : "input-error"}
              aria-invalid={!ipIsValid}
            />
            {!ipIsValid && (
              <span className="input-hint" role="alert">
                Enter a valid IPv4 address (example: 8.8.8.8).
              </span>
            )}
          </label>
        </div>

        <div className="cidr-quick-summary">
          <InclusionResult state={inclusionState} />
        </div>

        <CidrRangeDetails parsed={parsedCidr} />
      </div>
    </section>
  );
}

function InclusionResult({ state }: { state: InclusionState }): JSX.Element {
  if (state === "unknown") {
    return (
      <p className="cidr-inclusion cidr-inclusion--unknown">
        Provide a CIDR block and address to see whether the IP is within the range.
      </p>
    );
  }

  const isInside = state === "inside";

  return (
    <p
      className={`cidr-inclusion ${
        isInside ? "cidr-inclusion--inside" : "cidr-inclusion--outside"
      }`}
    >
      {isInside ? "✓ Yes — the IP is within the CIDR range." : "✕ No — the IP is outside the CIDR range."}
    </p>
  );
}

function CidrRangeDetails({ parsed }: { parsed: ParsedCidr | null }): JSX.Element {
  if (!parsed) {
    return (
      <div className="cidr-details cidr-details--empty">
        <p>Enter a CIDR block to view address boundaries and host counts.</p>
      </div>
    );
  }

  return (
    <div className="cidr-details">
      <dl>
        <div>
          <dt>Network address</dt>
          <dd>{parsed.networkAddress}</dd>
        </div>
        <div>
          <dt>Broadcast address</dt>
          <dd>{parsed.broadcastAddress}</dd>
        </div>
        <div>
          <dt>First usable</dt>
          <dd>{parsed.firstUsableAddress}</dd>
        </div>
        <div>
          <dt>Last usable</dt>
          <dd>{parsed.lastUsableAddress}</dd>
        </div>
        <div>
          <dt>Total addresses</dt>
          <dd>{parsed.totalHosts.toLocaleString()}</dd>
        </div>
      </dl>
    </div>
  );
}
