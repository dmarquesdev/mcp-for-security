#!/bin/bash
set -e
go install github.com/projectdiscovery/alterx/cmd/alterx@latest
BIN_ARGS=("$(which alterx)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
