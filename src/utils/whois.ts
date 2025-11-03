export interface WhoisDomainSummary {
  domain: string;
  registrar?: string;
  statuses: string[];
  createdOn?: string;
  updatedOn?: string;
  expiresOn?: string;
}

export interface WhoisIpSummary {
  networkName?: string;
  handle?: string;
  org?: string;
  country?: string;
  startAddress?: string;
  endAddress?: string;
  ipVersion?: string;
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

interface RdapDomainResponse {
  LDHName?: string;
  entities?: RdapEntity[];
  status?: string[];
  events?: RdapEvent[];
}

interface RdapIpResponse {
  name?: string;
  handle?: string;
  startAddress?: string;
  endAddress?: string;
  ipVersion?: string;
  country?: string;
  entities?: RdapEntity[];
}

function extractEntityName(entity?: RdapEntity): string | undefined {
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

export async function fetchDomainWhois(hostname: string): Promise<WhoisDomainSummary> {
  const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(hostname)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WHOIS lookup responded with status ${response.status}`);
  }

  const payload = (await response.json()) as RdapDomainResponse;
  const registrarEntity = payload.entities?.find((entity) => entity.roles?.includes("registrar"));
  const registrar = extractEntityName(registrarEntity);

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

export async function fetchIpWhois(ip: string): Promise<WhoisIpSummary> {
  const response = await fetch(`https://rdap.org/ip/${encodeURIComponent(ip)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`IP WHOIS lookup responded with status ${response.status}`);
  }

  const payload = (await response.json()) as RdapIpResponse;

  const orgEntity =
    payload.entities?.find((entity) => entity.roles?.includes("registrant")) ??
    payload.entities?.find((entity) => entity.roles?.includes("administrative"));

  return {
    networkName: payload.name,
    handle: payload.handle,
    org: extractEntityName(orgEntity),
    country: payload.country,
    startAddress: payload.startAddress,
    endAddress: payload.endAddress,
    ipVersion: payload.ipVersion,
  };
}

export function formatTimestamp(value?: string): string {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
