#!/bin/bash
set -e
go install github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
BIN_ARGS=("$(which nuclei)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
