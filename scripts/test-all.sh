#!/usr/bin/env bash
#
# Run all tests across the mcp-for-security monorepo.
# No security tools required — tests use mock spawn.
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILED=()
PASSED=()
SKIPPED=()

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo "╔════════════════════════════════════════════╗"
echo "║  MCP-for-Security Test Suite               ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Step 1: Build mcp-shared (required by all)
echo "━━━ Building mcp-shared ━━━"
cd "$ROOT_DIR/packages/mcp-shared"
npm install --silent 2>/dev/null
npm run build 2>&1
echo ""

# Step 2: Test mcp-shared
echo "━━━ Testing mcp-shared ━━━"
if npm test 2>&1; then
    PASSED+=("mcp-shared")
else
    FAILED+=("mcp-shared")
fi
echo ""

# Step 3: Build test-helpers
echo "━━━ Building test-helpers ━━━"
cd "$ROOT_DIR/packages/test-helpers"
npm install --silent 2>/dev/null
npm run build 2>&1
echo ""

# Step 4: Test all MCP servers
echo "━━━ Testing MCP Servers ━━━"
for dir in "$ROOT_DIR"/servers/*-mcp; do
    name=$(basename "$dir")

    # Skip if no test script in package.json
    if ! grep -q '"test"' "$dir/package.json" 2>/dev/null; then
        SKIPPED+=("$name")
        continue
    fi

    # Skip if no test files
    if [ ! -d "$dir/src/__tests__" ]; then
        SKIPPED+=("$name")
        continue
    fi

    echo "  Testing $name..."
    cd "$dir"

    # Install deps (including test-helpers) and build
    npm install --silent 2>/dev/null
    if ! npm run build 2>&1 | tail -1; then
        echo -e "  ${RED}✗ $name (build failed)${NC}"
        FAILED+=("$name")
        continue
    fi

    # Run tests
    if npm test 2>&1 | tail -5; then
        PASSED+=("$name")
    else
        echo -e "  ${RED}✗ $name (tests failed)${NC}"
        FAILED+=("$name")
    fi
    echo ""
done

# Step 5: Test integration
echo "━━━ Testing Integration ━━━"
cd "$ROOT_DIR/test-integration"
npm install --silent 2>/dev/null
npm run build 2>&1
if npm test 2>&1; then
    PASSED+=("test-integration")
else
    FAILED+=("test-integration")
fi
echo ""

# Summary
echo "╔════════════════════════════════════════════╗"
echo "║  Test Results                              ║"
echo "╚════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}Passed (${#PASSED[@]}):${NC}"
for p in "${PASSED[@]}"; do
    echo -e "  ${GREEN}✔ $p${NC}"
done

if [ ${#SKIPPED[@]} -gt 0 ]; then
    echo ""
    echo -e "${YELLOW}Skipped (${#SKIPPED[@]}):${NC}"
    for s in "${SKIPPED[@]}"; do
        echo -e "  ${YELLOW}○ $s${NC}"
    done
fi

if [ ${#FAILED[@]} -gt 0 ]; then
    echo ""
    echo -e "${RED}Failed (${#FAILED[@]}):${NC}"
    for f in "${FAILED[@]}"; do
        echo -e "  ${RED}✗ $f${NC}"
    done
    echo ""
    exit 1
fi

echo ""
echo -e "${GREEN}All tests passed!${NC}"
