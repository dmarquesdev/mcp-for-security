#!/bin/bash
set -e
go install github.com/lc/gau/v2/cmd/gau@latest
BIN_ARGS=("$(which gau)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
