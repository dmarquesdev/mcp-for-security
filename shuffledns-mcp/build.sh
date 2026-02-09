#!/bin/bash
set -e
go install github.com/projectdiscovery/shuffledns/cmd/shuffledns@latest
BIN_ARGS=("$(which shuffledns)" "$(which massdns)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
