#!/bin/bash
# Shared build helper for all MCP servers.
# Source this from each server's build.sh after setting tool-specific variables.
#
# Required:
#   SERVICE_PATH  - already set to $(pwd) by the caller
#
# Optional (set before sourcing):
#   BIN_ARGS      - array of args to pass after index.js (default: empty)
#
# This script:
#   1. Runs npm install && npm run build
#   2. Registers the server in the root mcp-config.json

set -e

# --- npm build ---
npm install >/dev/null
npm run build >/dev/null

# --- mcp-config.json registration ---
SERVICE_PATH="${SERVICE_PATH:-$(pwd)}"
INDEX_PATH="$SERVICE_PATH/build/index.js"
COMMAND_NAME=$(basename "$SERVICE_PATH")
CONFIG_FILE="$SERVICE_PATH/../mcp-config.json"

[ -f "$CONFIG_FILE" ] || echo "{}" > "$CONFIG_FILE"

# Build the args JSON array: ["index.js", ...BIN_ARGS]
ARGS_JSON="[\"$INDEX_PATH\""
if [ ${#BIN_ARGS[@]} -gt 0 ]; then
    for a in "${BIN_ARGS[@]}"; do
        ARGS_JSON="$ARGS_JSON, \"$a\""
    done
fi
ARGS_JSON="$ARGS_JSON]"

jq --arg cmd "$COMMAND_NAME" \
   --argjson args_arr "$ARGS_JSON" \
   '.[$cmd] = { "command": "node", "args": $args_arr }' \
   "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
