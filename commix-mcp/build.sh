#!/bin/bash
set -e
[ -d "/opt/commix" ] || git clone https://github.com/commixproject/commix.git /opt/commix
SCRIPT_PATH="/opt/commix/commix.py"
[ -f "$SCRIPT_PATH" ] || exit 1
BIN_ARGS=("$(which python3)" "$SCRIPT_PATH")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
