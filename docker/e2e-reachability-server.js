/**
 * E2E reachability helper: runs inside Docker on the tools network.
 * GET /:target returns 200 if the target container is reachable from here, 503 otherwise.
 * Used by the E2E test runner (on the host) via the gateway so reachability is checked
 * from inside the container network, not from the host.
 */
const http = require("http");
const https = require("https");
const net = require("net");

const ALLOWED_TARGETS = new Set(["httpbin", "dvwa", "wordpress", "scan-target", "tls-target"]);
const TIMEOUT_MS = 5000;

// TCP-only targets: socat listeners that don't speak proper HTTP
const TCP_TARGETS = { "scan-target": 80 };

function tcpConnect(host, port) {
  return new Promise((resolve) => {
    const s = net.connect(port, host, () => { s.destroy(); resolve(true); });
    s.on("error", () => resolve(false));
    s.setTimeout(TIMEOUT_MS, () => { s.destroy(); resolve(false); });
  });
}

function fetchFromContainer(target) {
  if (target in TCP_TARGETS) return tcpConnect(target, TCP_TARGETS[target]);
  const isTls = target === "tls-target";
  const protocol = isTls ? https : http;
  const url = isTls ? "https://tls-target/" : `http://${target}/`;
  return new Promise((resolve) => {
    const opts = {
      timeout: TIMEOUT_MS,
      rejectUnauthorized: false,
    };
    const req = protocol.get(url, opts, (res) => {
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method !== "GET") {
    res.writeHead(405);
    res.end();
    return;
  }
  if (req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "e2e-reachability" }));
    return;
  }
  const target = req.url.replace(/^\//, "").split("/")[0];
  if (!target || !ALLOWED_TARGETS.has(target)) {
    res.writeHead(400);
    res.end("Unknown target");
    return;
  }
  const reachable = await fetchFromContainer(target);
  res.writeHead(reachable ? 200 : 503, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ target, reachable }));
});

server.listen(3000, "0.0.0.0", () => {
  console.error("e2e-reachability listening on 3000");
});
