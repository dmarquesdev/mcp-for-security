#!/bin/bash
set -e
[ -d "/opt/testssl" ] || git clone https://github.com/testssl/testssl.sh.git /opt/testssl
TESTSSL_PATH="/opt/testssl/testssl.sh"
[ -f "$TESTSSL_PATH" ] || exit 1
BIN_ARGS=("$TESTSSL_PATH")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
