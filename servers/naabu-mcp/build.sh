#!/bin/bash
set -e
go install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest
BIN_ARGS=("$(which naabu)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
