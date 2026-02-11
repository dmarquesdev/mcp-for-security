#!/bin/bash
# Builds the shared-builder image first, then all other services.
# Usage:
#   ./scripts/docker-build.sh              # Build shared-builder + all services
#   ./scripts/docker-build.sh nmap httpx   # Build shared-builder + specific services
set -e

echo "[*] Building shared-builder image..."
docker compose build shared-builder

if [ $# -eq 0 ]; then
    echo "[*] Building all services..."
    docker compose build
else
    echo "[*] Building services: $*"
    docker compose build "$@"
fi

echo "[*] Build complete."
