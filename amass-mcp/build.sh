#!/bin/bash
set -e
go install github.com/owasp-amass/amass/v4/...@master
BIN_ARGS=("$(which amass)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
