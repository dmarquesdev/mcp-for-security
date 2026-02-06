#!/bin/bash

set -e

npm install >/dev/null
npm run build >/dev/null

# Clone SecLists if not already present
SECLISTS_DIR="/opt/seclists"
if [ ! -d "$SECLISTS_DIR" ]; then
    echo "[+] Cloning SecLists..."
    git clone --depth 1 https://github.com/danielmiessler/SecLists.git "$SECLISTS_DIR"
else
    echo "[+] SecLists already present at $SECLISTS_DIR"
fi

SERVICE_PATH=$(pwd)
INDEX_PATH="$SERVICE_PATH/build/index.js"
COMMAND_NAME=$(basename "$SERVICE_PATH")
CONFIG_FILE="$SERVICE_PATH/../mcp-config.json"

[ -f "$CONFIG_FILE" ] || echo "{}" > "$CONFIG_FILE"

jq --arg cmd "$COMMAND_NAME" \
   --arg node_path "$INDEX_PATH" \
   --arg seclists_path "$SECLISTS_DIR" \
   '.[$cmd] = { "command": "node", "args": [$node_path, $seclists_path] }' \
   "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
