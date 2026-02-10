#!/bin/bash
set -e
BIN_ARGS=("$(which nmap)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
