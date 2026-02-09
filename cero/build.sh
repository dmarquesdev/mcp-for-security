#!/bin/bash
set -e
go install github.com/glebarez/cero@latest
BIN_ARGS=("$(which cero)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
