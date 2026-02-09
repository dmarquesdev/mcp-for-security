#!/bin/bash
set -e
BIN_ARGS=("$(which sslscan)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
