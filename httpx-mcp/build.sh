#!/bin/bash
set -e
go install github.com/projectdiscovery/httpx/cmd/httpx@latest
BIN_ARGS=("$(which httpx)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
