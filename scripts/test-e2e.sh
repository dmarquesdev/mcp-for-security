#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source .env for MCP_API_KEY and other variables
if [ -f "$ROOT_DIR/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

GATEWAY_URL="${E2E_GATEWAY_URL:-http://localhost:8000}"
MCP_API_KEY="${MCP_API_KEY:-}"

echo "═══════════════════════════════════════════"
echo "  MCP E2E Test Suite"
echo "═══════════════════════════════════════════"
echo ""
echo "Gateway: $GATEWAY_URL"
echo ""

# Check gateway is reachable
echo "Checking gateway health..."
if ! curl -sf --max-time 5 "$GATEWAY_URL/" > /dev/null 2>&1; then
  echo "ERROR: Gateway not reachable at $GATEWAY_URL"
  echo "Start services with: docker compose --profile e2e up -d"
  exit 1
fi
echo "Gateway is up."
echo ""

# Check e2e target containers
echo "Checking e2e target containers..."
for target_port in "httpbin:${HTTPBIN_PORT:-8081}" "dvwa:${DVWA_PORT:-8082}" "wordpress:${WORDPRESS_PORT:-8083}"; do
  name="${target_port%%:*}"
  port="${target_port##*:}"
  if curl -sf --max-time 3 "http://localhost:$port/" > /dev/null 2>&1; then
    echo "  $name is reachable on port $port"
  else
    echo "  WARN: $name not reachable (related tests will skip)"
  fi
done
echo ""

# Count healthy services
echo "Checking service health..."
HEALTHY=0
TOTAL=0
SERVICES=(alterx arjun assetfinder cero commix crtsh ffuf github-subdomains gobuster gowitness http-headers-security httpx katana masscan mobsf nmap nuclei scoutsuite shuffledns smuggler sqlmap sslscan subfinder testssl urldedupe waybackurls wpscan)

for svc in "${SERVICES[@]}"; do
  TOTAL=$((TOTAL + 1))
  if curl -sf --max-time 3 ${MCP_API_KEY:+-H "X-API-Key: $MCP_API_KEY"} "$GATEWAY_URL/$svc/healthz" > /dev/null 2>&1; then
    HEALTHY=$((HEALTHY + 1))
  else
    echo "  WARN: $svc is not healthy (tests will be skipped)"
  fi
done

echo ""
echo "Healthy services: $HEALTHY / $TOTAL"
echo ""

# Build test-e2e package
echo "Building test-e2e..."
cd "$ROOT_DIR"
npm -w test-e2e run build
echo ""

# Run tests serially
echo "Running E2E tests..."
echo ""
MCP_API_KEY="$MCP_API_KEY" node --test --test-concurrency=1 --test-timeout=120000 "$ROOT_DIR/test-e2e/build/tests/"*.e2e.js
