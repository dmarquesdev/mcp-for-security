#!/bin/bash

set -e

npm install >/dev/null
npm run build >/dev/null

# Clone testssl.sh if not already present
[ -d "/opt/testssl" ] || git clone https://github.com/testssl/testssl.sh.git /opt/testssl

TESTSSL_PATH="/opt/testssl/testssl.sh"
SERVICE_PATH=$(pwd)
INDEX_PATH="$SERVICE_PATH/build/index.js"
COMMAND_NAME=$(basename "$SERVICE_PATH")
CONFIG_FILE="$SERVICE_PATH/../mcp-config.json"

[ -f "$TESTSSL_PATH" ] || exit 1
[ -f "$CONFIG_FILE" ] || echo "{}" > "$CONFIG_FILE"

jq --arg cmd "$COMMAND_NAME" \
   --arg index_path "$INDEX_PATH" \
   --arg testssl_path "$TESTSSL_PATH" \
   '.[$cmd] = { "command": "node", "args": [$index_path, $testssl_path] }' \
   "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
