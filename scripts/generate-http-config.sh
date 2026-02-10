#!/bin/bash
# Generate gateway-aware mcp-config.json for Docker Compose deployment.
# Reads service names from docker-compose.yml and produces URL-based config.
#
# Usage:
#   ./scripts/generate-http-config.sh [gateway-url]
#
# Default gateway: http://localhost:8000

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
CONFIG_FILE="$ROOT_DIR/mcp-config.json"
GATEWAY="${1:-http://localhost:8000}"

if [ ! -f "$COMPOSE_FILE" ]; then
    echo "Error: docker-compose.yml not found at $COMPOSE_FILE" >&2
    exit 1
fi

# Extract service names from docker-compose.yml, excluding 'gateway'
SERVICES=$(grep -E '^\s{2}[a-z]' "$COMPOSE_FILE" | grep -v gateway | sed 's/://g' | awk '{print $1}' | sort -u)

# Build JSON config
CONFIG='{"mcpServers":{'
FIRST=true
for svc in $SERVICES; do
    if [ "$FIRST" = true ]; then
        FIRST=false
    else
        CONFIG="$CONFIG,"
    fi
    CONFIG="$CONFIG\"$svc\":{\"url\":\"${GATEWAY}/${svc}\"}"
done
CONFIG="$CONFIG}}"

# Pretty-print with jq if available, otherwise raw JSON
if command -v jq >/dev/null 2>&1; then
    echo "$CONFIG" | jq . > "$CONFIG_FILE"
else
    echo "$CONFIG" > "$CONFIG_FILE"
fi

echo "Generated $CONFIG_FILE with gateway: $GATEWAY"
echo "Services: $(echo "$SERVICES" | wc -w | tr -d ' ')"
