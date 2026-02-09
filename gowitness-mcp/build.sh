#!/bin/bash
set -e
go install github.com/sensepost/gowitness@latest
BIN_ARGS=("$(which gowitness)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
