#!/bin/bash
set -e
if ! command -v uro &> /dev/null; then
  pipx install uro || pip install uro
fi
BIN_ARGS=("$(which uro)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
