#!/bin/bash
set -e
source /opt/venv/bin/activate
pip install arjun >/dev/null
BIN_ARGS=("$(which arjun)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
