import { useCallback, useEffect, useState } from "react";

interface UsePublicIpResult {
  ip: string;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

interface PublicIpPayload {
  ip: string;
  source?: string;
}

const SERVER_ENDPOINT = "/server/public-ip";
const CHECK_IP_URL = "https://checkip.amazonaws.com";
const IPV4_REGEX =
  /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;

async function fetchFromServer(): Promise<string> {
  const response = await fetch(SERVER_ENDPOINT, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Server responded with status ${response.status}`);
  }

  const payload = (await response.json()) as Partial<PublicIpPayload>;

  if (!payload.ip || typeof payload.ip !== "string") {
    throw new Error("Server response did not include an IP address.");
  }

  if (!IPV4_REGEX.test(payload.ip)) {
    throw new Error("Server response contained an invalid IPv4 address.");
  }

  return payload.ip;
}

async function fetchFromCheckip(): Promise<string> {
  const response = await fetch(CHECK_IP_URL, {
    cache: "no-store",
    headers: { Accept: "text/plain" },
  });

  if (!response.ok) {
    throw new Error(`Fallback provider responded with status ${response.status}`);
  }

  const text = (await response.text()).trim();
  if (!IPV4_REGEX.test(text)) {
    throw new Error("Fallback provider returned an unexpected response.");
  }

  return text;
}
export function usePublicIp(): UsePublicIpResult {
  const [ip, setIp] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  const load = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError("");

    try {
      const serverIp = await fetchFromServer();
      setIp(serverIp);
    } catch (err) {
      try {
        const fallbackIp = await fetchFromCheckip();
        setIp(fallbackIp);
        if (err instanceof Error) {
          console.warn("Server lookup failed. Using fallback provider:", err);
        } else {
          console.warn("Server lookup failed. Using fallback provider.");
        }
        setError("");
      } catch (fallbackErr) {
        const message =
          fallbackErr instanceof Error
            ? fallbackErr.message
            : "Unknown error while retrieving IP address.";
        setError(message);
        setIp("");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async (): Promise<void> => {
    await load();
  }, [load]);

  return { ip, loading, error, refresh };
}
