#!/bin/bash
set -e
go install github.com/hahwul/dalfox/v2@latest
BIN_ARGS=("$(which dalfox)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
