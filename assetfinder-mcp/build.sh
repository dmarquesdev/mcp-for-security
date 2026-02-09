#!/bin/bash
set -e
go install github.com/tomnomnom/assetfinder@latest
BIN_ARGS=("$(which assetfinder)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
