#!/bin/bash
set -e
SECLISTS_DIR="/opt/seclists"
if [ ! -d "$SECLISTS_DIR" ]; then
    echo "[+] Cloning SecLists..."
    git clone --depth 1 https://github.com/danielmiessler/SecLists.git "$SECLISTS_DIR"
else
    echo "[+] SecLists already present at $SECLISTS_DIR"
fi
BIN_ARGS=("$SECLISTS_DIR")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
