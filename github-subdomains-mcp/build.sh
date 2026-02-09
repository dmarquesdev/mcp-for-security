#!/bin/bash
set -e
go install github.com/gwen001/github-subdomains@latest
BIN_ARGS=("$(which github-subdomains)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
