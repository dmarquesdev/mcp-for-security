#!/bin/bash
set -e
go install github.com/OJ/gobuster/v3@latest
BIN_ARGS=("$(which gobuster)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
