#!/bin/bash
set -e
[ -d "/opt/smuggler" ] || git clone https://github.com/defparam/smuggler /opt/smuggler
SCRIPT_PATH="/opt/smuggler/smuggler.py"
[ -f "$SCRIPT_PATH" ] || exit 1
BIN_ARGS=("$(which python3)" "$SCRIPT_PATH")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
