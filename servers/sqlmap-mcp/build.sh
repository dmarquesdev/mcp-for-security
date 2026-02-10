#!/bin/bash
set -e
SQLMAP_BIN=$(which sqlmap)
[ -x "$SQLMAP_BIN" ] || exit 1
BIN_ARGS=("sqlmap")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
