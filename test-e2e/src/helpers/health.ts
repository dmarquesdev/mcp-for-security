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

/** Host ports for non-MCP target containers (e2e profile) */
const TARGET_PORTS: Record<string, number> = {
  httpbin: Number(process.env.HTTPBIN_PORT || 8081),
  dvwa: Number(process.env.DVWA_PORT || 8082),
  wordpress: Number(process.env.WORDPRESS_PORT || 8083),
};

const targetCache: Record<string, boolean> = {};

/** Check if a non-MCP target container is reachable from the host */
export async function isTargetReachable(target: string): Promise<boolean> {
  if (target in targetCache) return targetCache[target];
  const port = TARGET_PORTS[target];
  if (!port) return false;
  try {
    const resp = await fetch(`http://localhost:${port}/`, {
      signal: AbortSignal.timeout(5000),
    });
    targetCache[target] = resp.status < 500;
  } catch {
    targetCache[target] = false;
  }
  return targetCache[target];
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
  "ffuf",
  "gau",
  "github-subdomains",
  "gobuster",
  "gowitness",
  "http-headers-security",
  "httpx",
  "katana",
  "masscan",
  "naabu",
  "mobsf",
  "nmap",
  "nuclei",
  "scoutsuite",
  "seclists",
  "shodan",
  "shuffledns",
  "smuggler",
  "sqlmap",
  "sslscan",
  "subfinder",
  "testssl",
  "urldedupe",
  "waybackurls",
  "wpscan",
] as const;
