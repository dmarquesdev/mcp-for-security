#!/bin/bash
set -e
go install github.com/projectdiscovery/asnmap/cmd/asnmap@latest
BIN_ARGS=("$(which asnmap)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
