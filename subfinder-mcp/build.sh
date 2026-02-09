#!/bin/bash
set -e
go install github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
BIN_ARGS=("$(which subfinder)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
