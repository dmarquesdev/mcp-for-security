#!/bin/bash
# LOCAL NON-DOCKER DEVELOPMENT ONLY
# This script builds all servers natively (outside Docker) by running each
# server's build.sh, which installs the underlying security tool, compiles
# TypeScript, and updates mcp-config.json.
#
# For Docker deployments, use: ./scripts/docker-build.sh

echo "[*] Starting all services..."

# Loop through all server directories
for dir in servers/*-mcp ; do
    # Skip if not a directory
    [ -d "$dir" ] || continue

    # Check if build.sh exists in the directory
    if [ -f "$dir/build.sh" ]; then
        echo "[+] Found build.sh in $dir, executing..."
        chmod +x "$dir/build.sh"
        (cd "$dir" && ./build.sh)
    else
        echo "[-] No build.sh found in $dir, skipping..."
    fi
done

jq '{mcpServers: with_entries(.value += {dockerContainer: ""})}' mcp-config.json > mcp-config.tmp && mv mcp-config.tmp mcp-config.json

echo "[*] All build scripts executed. Container will now remain running."

cat mcp-config.json