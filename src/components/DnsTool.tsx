import { FormEvent, useMemo, useState } from "react";

type RecordType = "A" | "AAAA" | "CNAME" | "TXT" | "MX" | "NS";

interface GoogleDnsAnswer {
  name: string;
  type: number;
  TTL: number;
  data: string;
}

interface GoogleDnsResponse {
  Status: number;
  Answer?: GoogleDnsAnswer[];
  Comment?: string;
}

interface DnsRecord {
  name: string;
  ttl: number;
  data: string;
}

interface AggregatedRecord extends DnsRecord {
  count: number;
}

interface RdapEntity {
  roles?: string[];
  objectName?: string;
  vcardArray?: [string, Array<[string, unknown, string, string]>];
}

interface RdapEvent {
  eventAction?: string;
  eventDate?: string;
}

interface RdapResponse {
  LDHName?: string;
  entities?: RdapEntity[];
  status?: string[];
  events?: RdapEvent[];
}

interface WhoisSummary {
  domain: string;
  registrar?: string;
  statuses: string[];
  createdOn?: string;
  updatedOn?: string;
  expiresOn?: string;
}

const RECORD_TYPES: Array<{ value: RecordType; label: string }> = [
  { value: "A", label: "A (IPv4)" },
  { value: "AAAA", label: "AAAA (IPv6)" },
  { value: "CNAME", label: "CNAME" },
  { value: "TXT", label: "TXT" },
  { value: "MX", label: "MX" },
  { value: "NS", label: "NS" },
];

const TYPE_TO_CODE: Record<RecordType, number> = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  TXT: 16,
  MX: 15,
  NS: 2,
};

const REGION_MARKERS = [
  { name: "North America", x: 200, y: 120, status: "pending" },
  { name: "South America", x: 240, y: 240, status: "pending" },
  { name: "Europe", x: 380, y: 110, status: "pending" },
  { name: "Africa", x: 390, y: 220, status: "pending" },
  { name: "Asia", x: 520, y: 150, status: "pending" },
  { name: "Oceania", x: 620, y: 260, status: "pending" },
];

function normaliseRecordData(type: RecordType, raw: string): string {
  switch (type) {
    case "CNAME":
    case "NS":
      return raw.endsWith(".") ? raw.slice(0, -1) : raw;
    case "TXT":
      return raw.replace(/^"|"$/g, "");
    default:
      return raw;
  }
}

function aggregateRecords(records: DnsRecord[]): AggregatedRecord[] {
  const map = new Map<string, AggregatedRecord>();

  records.forEach((record) => {
    const key = `${record.data}|${record.ttl}`;
    const existing = map.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      map.set(key, { ...record, count: 1 });
    }
  });

  return Array.from(map.values()).sort((a, b) => a.data.localeCompare(b.data));
}

async function resolveDnsRecords(hostname: string, recordType: RecordType): Promise<DnsRecord[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const url = new URL("https://dns.google/resolve");
    url.searchParams.set("name", hostname);
    url.searchParams.set("type", TYPE_TO_CODE[recordType].toString());

    const response = await fetch(url.toString(), {
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DNS resolver responded with status ${response.status}`);
    }

    const payload = (await response.json()) as GoogleDnsResponse;

    if (payload.Status !== 0) {
      const reason = payload.Comment || "Resolver returned an error.";
      throw new Error(reason);
    }

    if (!payload.Answer || payload.Answer.length === 0) {
      throw new Error("No records were returned for this query.");
    }

    const filtered = payload.Answer.filter((answer) => answer.type === TYPE_TO_CODE[recordType]);

    if (filtered.length === 0) {
      throw new Error("No records were returned for this record type.");
    }

    return filtered.map((answer) => ({
      name: answer.name.endsWith(".") ? answer.name.slice(0, -1) : answer.name,
      ttl: answer.TTL,
      data: normaliseRecordData(recordType, answer.data),
    }));
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function extractRegistrar(entity?: RdapEntity): string | undefined {
  if (!entity) {
    return undefined;
  }

  if (entity.objectName) {
    return entity.objectName;
  }

  const vcard = entity.vcardArray?.[1];
  if (!vcard) {
    return undefined;
  }

  const match = vcard.find((entry) => entry[0] === "fn" || entry[0] === "org");
  return match ? (match[3] as string) : undefined;
}

function findEventDate(events: RdapEvent[] | undefined, actions: string[]): string | undefined {
  if (!events) {
    return undefined;
  }

  for (const action of actions) {
    const match = events.find((event) => event.eventAction?.toLowerCase() === action);
    if (match?.eventDate) {
      return match.eventDate;
    }
  }

  return undefined;
}

async function fetchWhoisSummary(hostname: string): Promise<WhoisSummary> {
  const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(hostname)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WHOIS lookup responded with status ${response.status}`);
  }

  const payload = (await response.json()) as RdapResponse;

  const registrarEntity = payload.entities?.find((entity) => entity.roles?.includes("registrar"));
  const registrar = extractRegistrar(registrarEntity);

  const createdOn = findEventDate(payload.events, ["registration", "domain registration"]);
  const updatedOn = findEventDate(payload.events, ["last update of rdap database", "last update"]);
  const expiresOn = findEventDate(payload.events, ["expiration", "expiration date"]);

  return {
    domain: (payload.LDHName ?? hostname).toLowerCase(),
    registrar,
    statuses: payload.status ?? [],
    createdOn,
    updatedOn,
    expiresOn,
  };
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function DnsTool(): JSX.Element {
  const [hostname, setHostname] = useState<string>("example.com");
  const [recordType, setRecordType] = useState<RecordType>("A");
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [whois, setWhois] = useState<WhoisSummary | null>(null);
  const [whoisLoading, setWhoisLoading] = useState<boolean>(false);
  const [whoisError, setWhoisError] = useState<string>("");

  const isHostnameValid = useMemo(() => hostname.trim().length > 0, [hostname]);
  const aggregatedRecords = useMemo(() => aggregateRecords(records), [records]);

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isHostnameValid) {
      setError("Enter a hostname to look up.");
      setRecords([]);
      return;
    }

    setLoading(true);
    setWhoisLoading(true);
    setError("");
    setWhoisError("");
    setRecords([]);
    setWhois(null);

    const trimmedHost = hostname.trim();

    const [dnsResult, whoisResult] = await Promise.allSettled([
      resolveDnsRecords(trimmedHost, recordType),
      fetchWhoisSummary(trimmedHost),
    ]);

    if (dnsResult.status === "fulfilled") {
      setRecords(dnsResult.value);
    } else {
      const reason = dnsResult.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unknown error while performing DNS lookup.";
      setError(message);
    }

    if (whoisResult.status === "fulfilled") {
      setWhois(whoisResult.value);
    } else {
      const reason = whoisResult.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === "string"
            ? reason
            : "Unknown error while retrieving WHOIS information.";
      setWhoisError(message);
    }

    setLoading(false);
    setWhoisLoading(false);
  }

  return (
    <section className="card">
      <header className="card-header">
        <h2 className="card-title">DNS Lookup</h2>
      </header>

      <div className="card-body column-gap">
        <form className="dns-form" onSubmit={handleLookup}>
          <label className="input-block">
            <span className="input-label">Hostname</span>
            <input
              type="text"
              value={hostname}
              onChange={(event) => setHostname(event.target.value)}
              placeholder="e.g. example.com"
              aria-invalid={!isHostnameValid}
            />
          </label>

          <label className="input-block">
            <span className="input-label">Record type</span>
            <select
              value={recordType}
              onChange={(event) => setRecordType(event.target.value as RecordType)}
            >
              {RECORD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Resolving..." : "Lookup"}
          </button>
        </form>

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        {!error && aggregatedRecords.length > 0 && (
          <ul className="dns-records">
            {aggregatedRecords.map((record) => (
              <li key={`${record.name}-${record.data}-${record.ttl}`}>
                <div className="dns-record-header">
                  <span className="dns-record-name">{record.name}</span>
                  <span className="dns-record-type">{recordType}</span>
                </div>
                <div className="dns-record-value">{record.data}</div>
                <div className="dns-record-meta">
                  <span className="dns-record-ttl">TTL {record.ttl}s</span>
                  {record.count > 1 && (
                    <span className="dns-record-count">{record.count} results</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="dns-whois">
          <header>
            <h3>WHOIS snapshot</h3>
            <p>Domain registration highlights sourced from the public RDAP registry.</p>
          </header>
          {whoisLoading && <p className="dns-whois-status">Loading WHOIS details…</p>}
          {whoisError && !whoisLoading && (
            <p className="dns-whois-status dns-whois-status--error">{whoisError}</p>
          )}
          {whois && !whoisLoading && (
            <dl className="dns-whois-details">
              <div>
                <dt>Domain</dt>
                <dd>{whois.domain}</dd>
              </div>
              <div>
                <dt>Registrar</dt>
                <dd>{whois.registrar ?? "—"}</dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatTimestamp(whois.createdOn)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>{formatTimestamp(whois.updatedOn)}</dd>
              </div>
              <div>
                <dt>Expires</dt>
                <dd>{formatTimestamp(whois.expiresOn)}</dd>
              </div>
              {whois.statuses.length > 0 && (
                <div className="dns-whois-statuses">
                  <dt>Status</dt>
                  <dd>
                    {whois.statuses.map((status) => (
                      <span key={status} className="dns-whois-status-pill">
                        {status}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </section>

        <section className="dns-propagation">
          <header>
            <h3>Propagation map (coming soon)</h3>
            <p>
              We&apos;re building real-time propagation checks across global vantage points. For now,
              review the map scaffold below and stay tuned.
            </p>
          </header>
          <PropagationMap />
        </section>
      </div>
    </section>
  );
}

function PropagationMap(): JSX.Element {
  return (
    <div className="dns-map">
      <svg viewBox="0 0 800 400" role="img" aria-label="DNS propagation world map scaffold">
        <defs>
          <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--map-land)" />
            <stop offset="100%" stopColor="var(--map-land-strong)" />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="800" height="400" fill="url(#mapGradient)" opacity="0.35" />
        <path
          d="M70 170 L140 120 L220 130 L240 90 L310 80 L340 110 L320 150 L260 150 L200 220 L120 210 Z"
          fill="var(--map-land)"
          opacity="0.6"
        />
        <path
          d="M220 230 L310 270 L320 320 L260 340 L210 300 Z"
          fill="var(--map-land)"
          opacity="0.6"
        />
        <path
          d="M360 150 L420 110 L480 120 L540 160 L520 210 L460 220 L410 200 Z"
          fill="var(--map-land)"
          opacity="0.6"
        />
        <path
          d="M420 230 L460 220 L510 240 L520 300 L450 310 L400 280 Z"
          fill="var(--map-land)"
          opacity="0.6"
        />
        <path
          d="M560 200 L620 170 L700 200 L720 250 L660 300 L580 280 Z"
          fill="var(--map-land)"
          opacity="0.6"
        />
        {REGION_MARKERS.map((marker) => (
          <g key={marker.name}>
            <circle
              cx={marker.x}
              cy={marker.y}
              r={10}
              className={`dns-region dns-region--${marker.status}`}
            />
            <text x={marker.x + 14} y={marker.y + 4} className="dns-region-label">
              {marker.name}
            </text>
          </g>
        ))}
      </svg>
      <p className="dns-map-footnote">Propagation statuses will populate here in a future release.</p>
    </div>
  );
}
