#!/bin/bash
set -e
go install github.com/hakluke/hakrawler@latest
BIN_ARGS=("$(which hakrawler)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
