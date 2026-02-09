#!/bin/bash
set -e
go install github.com/tomnomnom/waybackurls@latest
BIN_ARGS=("$(which waybackurls)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"
