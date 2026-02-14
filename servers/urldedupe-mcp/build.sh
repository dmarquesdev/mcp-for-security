#!/bin/bash
set -e
# Build urldedupe from source if not installed
if ! command -v urldedupe &> /dev/null; then
  git clone https://github.com/ameenmaali/urldedupe.git /tmp/urldedupe
  cd /tmp/urldedupe && cmake CMakeLists.txt && make
  cp urldedupe /usr/local/bin/
  cd -
fi
BIN_ARGS=("$(which urldedupe)")
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../../scripts/build-common.sh"
