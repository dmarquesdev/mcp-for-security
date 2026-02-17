const GATEWAY = process.env.E2E_GATEWAY_URL || "http://localhost:8000";
const API_KEY = process.env.MCP_API_KEY || "";
const AUTH_HEADERS: Record<string, string> = API_KEY ? { "X-API-Key": API_KEY } : {};

export async function isServiceHealthy(service: string): Promise<boolean> {
  try {
    const resp = await fetch(`${GATEWAY}/${service}/healthz`, {
      signal: AbortSignal.timeout(5000),
      headers: AUTH_HEADERS,
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function waitForGateway(
  maxWaitMs = 30000,
  intervalMs = 2000,
): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    try {
      const resp = await fetch(`${GATEWAY}/`, {
        signal: AbortSignal.timeout(3000),
        headers: AUTH_HEADERS,
      });
      if (resp.ok || resp.status === 404) return true;
    } catch {
      // not ready yet
    }
    await sleep(intervalMs);
  }
  return false;
}

export async function waitForService(
  service: string,
  maxWaitMs = 30000,
  intervalMs = 2000,
): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await isServiceHealthy(service)) return true;
    await sleep(intervalMs);
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const targetCache: Record<string, boolean> = {};

/** Check if a non-MCP target container is reachable from inside the Docker network (via gateway → e2e-reachability) */
export async function isTargetReachable(target: string): Promise<boolean> {
  if (target in targetCache) return targetCache[target];
  try {
    const resp = await fetch(`${GATEWAY}/e2e-reachability/${encodeURIComponent(target)}`, {
      signal: AbortSignal.timeout(10000),
      headers: AUTH_HEADERS,
    });
    if (!resp.ok) {
      // Don't cache negative results — let next test retry (service may still be starting)
      return false;
    }
    const data = (await resp.json()) as { target?: string; reachable?: boolean };
    const reachable = data.reachable === true;
    if (reachable) targetCache[target] = true;
    return reachable;
  } catch {
    // Don't cache negative results — let next test retry
    return false;
  }
}

/** Wait for a target container to become reachable */
export async function waitForTarget(
  target: string,
  maxWaitMs = 30000,
  intervalMs = 2000,
): Promise<boolean> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (await isTargetReachable(target)) return true;
    delete targetCache[target]; // clear cache so next check is fresh
    await sleep(intervalMs);
  }
  return false;
}

/** All 32 service names matching docker-compose service names */
export const ALL_SERVICES = [
  "alterx",
  "arjun",
  "asnmap",
  "assetfinder",
  "cero",
  "commix",
  "crtsh",
  "dalfox",
  "ffuf",
  "gau",
  "github-subdomains",
  "gobuster",
  "gowitness",
  "hakrawler",
  "http-headers-security",
  "httpx",
  "katana",
  "masscan",
  "naabu",
  "mobsf",
  "nmap",
  "nuclei",
  "scoutsuite",
  "shodan",
  "shuffledns",
  "smuggler",
  "sqlmap",
  "sslscan",
  "subfinder",
  "testssl",
  "urldedupe",
  "uro",
  "waybackurls",
  "wpscan",
] as const;
