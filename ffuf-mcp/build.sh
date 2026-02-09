#!/bin/bash
set -e
go install github.com/ffuf/ffuf/v2@latest
BIN_ARGS=("$(which ffuf)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
