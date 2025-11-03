export interface ParsedCidr {
  cidr: string;
  networkAddress: string;
  broadcastAddress: string;
  firstUsableAddress: string;
  lastUsableAddress: string;
  totalHosts: number;
  prefixLength: number;
}

const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;

function parseIpv4ToInt(ip: string): number | null {
  if (!IPV4_REGEX.test(ip)) {
    return null;
  }

  return ip.split(".").reduce((acc, part) => (acc << 8) + Number.parseInt(part, 10), 0);
}

function intToIpv4(value: number): string {
  return [24, 16, 8, 0]
    .map((shift) => ((value >> shift) & 0xff).toString(10))
    .join(".");
}

export function isValidIpv4(ip: string): boolean {
  return parseIpv4ToInt(ip.trim()) !== null;
}

export function isIpInCidr(ip: string, cidr: string): boolean | null {
  const parsed = parseCidr(cidr);
  if (!parsed) {
    return null;
  }

  const ipValue = parseIpv4ToInt(ip.trim());
  if (ipValue === null) {
    return null;
  }

  const mask = createNetmask(parsed.prefixLength);
  const networkValue = parseIpv4ToInt(parsed.networkAddress);

  if (networkValue === null) {
    return null;
  }

  return (ipValue & mask) === networkValue;
}

export function parseCidr(cidr: string): ParsedCidr | null {
  const trimmed = cidr.trim();
  if (!trimmed.includes("/")) {
    return null;
  }

  const [ipPart, prefixPart] = trimmed.split("/");
  const prefixLength = Number.parseInt(prefixPart ?? "", 10);
  const ipValue = parseIpv4ToInt(ipPart ?? "");

  if (ipValue === null || Number.isNaN(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    return null;
  }

  const mask = createNetmask(prefixLength);
  const networkValue = ipValue & mask;
  const broadcastValue = networkValue | (~mask >>> 0);

  const totalHosts = prefixLength === 32 ? 1 : Math.pow(2, 32 - prefixLength);

  const firstUsable =
    prefixLength >= 31
      ? networkValue
      : networkValue + 1;
  const lastUsable =
    prefixLength >= 31
      ? broadcastValue
      : broadcastValue - 1;

  return {
    cidr: `${intToIpv4(networkValue)}/${prefixLength}`,
    networkAddress: intToIpv4(networkValue),
    broadcastAddress: intToIpv4(broadcastValue >>> 0),
    firstUsableAddress: intToIpv4(firstUsable >>> 0),
    lastUsableAddress: intToIpv4(lastUsable >>> 0),
    totalHosts,
    prefixLength,
  };
}

function createNetmask(prefixLength: number): number {
  return prefixLength === 0 ? 0 : (~((1 << (32 - prefixLength)) - 1) >>> 0);
}
