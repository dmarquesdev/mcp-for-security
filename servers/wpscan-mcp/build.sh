#!/bin/bash
set -e
[ -x "$(which wpscan)" ] || gem install wpscan
BIN_ARGS=("wpscan")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
