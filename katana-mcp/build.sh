#!/bin/bash
set -e
go install github.com/projectdiscovery/katana/cmd/katana@latest
BIN_ARGS=("$(which katana)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
