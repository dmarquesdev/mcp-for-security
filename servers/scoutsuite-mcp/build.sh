#!/bin/bash
set -e
source /opt/venv/bin/activate
pip install scoutsuite >/dev/null
BIN_ARGS=("$(which scout)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
