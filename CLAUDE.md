# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A monorepo of 28 MCP (Model Context Protocol) server implementations that wrap popular cybersecurity tools. Each server exposes security tools as MCP tools over stdio or HTTP transport, enabling AI assistants to invoke them. A shared utility library (`packages/mcp-shared/`) provides secure spawn, path sanitization, ANSI stripping, and dual-transport bootstrap. Originally created by [Cyprox](https://cyprox.io), independently maintained fork.

### Repository Structure

```
/
  packages/               # Shared libraries
    mcp-shared/           # Core utilities (spawn, sanitize, transport, env, etc.)
    test-helpers/         # Test utilities (mock spawn, test server factory)
  servers/                # All 28 MCP server implementations
    nmap-mcp/
    httpx-mcp/
    nuclei-mcp/
    ...25 more...
  test-integration/       # Integration tests
  test-e2e/               # E2E tests against live Docker containers
  docker/                 # Categorized Dockerfiles, Nginx config, e2e-wordlists
  scripts/                # Build and test scripts
  .env.example            # Environment variable template for credentials
  tsconfig.base.json      # Shared TypeScript config (all packages extend this)
```

The repo uses **npm workspaces** — all packages are linked via the root `package.json`. Run `npm install` at the repo root to install all dependencies.

## Build Commands

### Install all dependencies (npm workspaces)
```bash
npm install                                    # Install all workspace deps from repo root
```

### Build the shared library (must be built first)
```bash
npm run build:shared                           # Alias for: npm -w mcp-shared run build
npm run build:helpers                          # Alias for: npm -w test-helpers run build
```
All servers depend on `mcp-shared` via npm workspaces. Build it before building any server.

### Build a single MCP server
```bash
npm -w nmap-mcp run build                      # Or: cd servers/nmap-mcp && npm run build
```
`npm run build` runs `tsc` to compile TypeScript from `src/` to `build/index.js`.

### Build a single server with its tool dependencies
```bash
cd servers/<tool>-mcp && ./build.sh
```
Each `build.sh` installs the underlying security tool (Go binary, Python package, etc.), runs `npm install && npm run build`, and updates the root `mcp-config.json` via `jq`.

### Build all servers (used in Docker)
```bash
./start.sh
```
Iterates all `servers/*-mcp/` directories, runs each `build.sh`, then generates the unified `mcp-config.json`.

### Docker build (per-server images with Nginx gateway)
```bash
docker compose build                          # Build all images
docker compose up                             # Start gateway + all 28 servers
docker compose up gateway nmap httpx nuclei    # Start gateway + specific tools
docker compose --profile e2e up -d            # Start all servers + E2E test targets
```
Per-server multi-stage Docker images behind an Nginx gateway at `localhost:8000`. Each tool runs in its own container on internal port 3000. Gateway routes by URL path (e.g. `http://localhost:8000/nmap`).

**Categorized Dockerfiles** in `docker/`:

| Dockerfile | Serves | Tools |
|------------|--------|-------|
| `Dockerfile.go` | 13 Go tools | alterx, amass, assetfinder, cero, ffuf, github-subdomains, gobuster, gowitness, httpx, katana, nuclei, subfinder, waybackurls |
| `Dockerfile.system` | 3 system tools | nmap, masscan, sslscan |
| `Dockerfile.python-pip` | 2 pip tools | arjun, scoutsuite |
| `Dockerfile.python-git` | 3 git-cloned tools | commix, smuggler, sqlmap |
| `Dockerfile.ruby` | 1 Ruby tool | wpscan |
| `Dockerfile.shell` | 1 shell tool | testssl |
| `Dockerfile.seclists` | 1 wordlist tool | seclists |
| `Dockerfile.shuffledns` | 1 DNS tool | shuffledns |
| `Dockerfile.api` | 3 API-only tools | crtsh, http-headers-security, mobsf |
| `Dockerfile.gateway` | Nginx gateway | Reverse proxy + service discovery |

**Service discovery:** `GET http://localhost:8000/services` returns `docker/services.json` listing all 28 tools.

**E2E test targets** (activated via `--profile e2e`):

| Target | Port | Purpose |
|--------|------|---------|
| httpbin | 8081 | HTTP request/response testing |
| DVWA | 8082 | Vulnerable web application |
| WordPress | 8083 | WordPress instance for WPScan |

**E2E wordlists:** `docker/e2e-wordlists/` — lightweight wordlists mounted into ffuf, gobuster, and shuffledns containers.

### Generate gateway-aware client config
```bash
./scripts/generate-http-config.sh             # Produces mcp-config.json with gateway URLs
```

## Running an MCP Server

### Stdio transport (default)
```bash
node servers/<tool>-mcp/build/index.js <binary-path> [additional-args]
```
Example: `node servers/nmap-mcp/build/index.js nmap`

### HTTP transport
```bash
node servers/<tool>-mcp/build/index.js <binary-path> --transport http --port 3001
```
All servers support both stdio and HTTP transport via `startServer()` from `mcp-shared`.

### MCP client configuration (stdio)
```json
{
  "mcpServers": {
    "nmap-mcp": {
      "command": "node",
      "args": ["/path/to/servers/nmap-mcp/build/index.js", "nmap"]
    }
  }
}
```

## Testing

### Run all tests
```bash
npm test
```
This executes `scripts/test-all.sh`, which builds `mcp-shared` and `test-helpers`, then runs tests for all 28 servers plus integration tests. No security tools required — all server tests use mock spawn.

### Run tests for a single server
```bash
npm -w nmap-mcp run build && npm -w nmap-mcp test
```
Requires `mcp-shared` and `test-helpers` to be built first.

### Run mcp-shared tests only
```bash
npm -w mcp-shared run build && npm -w mcp-shared test
```

### Run integration tests only
```bash
cd test-integration && npm run build && npm test
```

### Run E2E tests (requires Docker containers running)
```bash
npm run test:e2e                               # Build + run all E2E tests
npm run test:e2e:smoke                         # Healthcheck-only E2E tests
```
E2E tests require `docker compose --profile e2e up -d` to be running. Tests connect to the gateway over HTTP and execute real tool invocations against live target containers.

### Test architecture (four tiers)

| Tier | Location | What it tests | Mechanism |
|------|----------|---------------|-----------|
| Unit | `packages/mcp-shared/src/__tests__/` | All 8 shared modules (spawn, args, env, sanitize, result, transport, timeout, loadenv) | Real commands (`echo`, `node -e`) for spawn; `process.argv`/`process.env` manipulation for args/env |
| Server | `servers/<tool>-mcp/src/__tests__/` | Tool registration, Zod schemas, arg construction, response formatting | `InMemoryTransport` + mock `secureSpawn` — no real security tools needed |
| Integration | `test-integration/src/` | Full MCP protocol cycle with real `secureSpawn` | `InMemoryTransport` with real `echo` command |
| E2E | `test-e2e/src/tests/` | Full tool execution against live Docker containers via HTTP gateway | Real MCP calls over HTTP to gateway; requires `docker compose --profile e2e up` |

### Test helpers (`packages/test-helpers/`)

Shared test utilities used by all server tests:

| Export | Purpose |
|--------|---------|
| `createTestServer(name)` | Creates `McpServer` + `Client` connected via `InMemoryTransport` with `connect()`/`cleanup()` lifecycle |
| `createMockSpawn(options?)` | Mock `secureSpawn` factory with call recording — captures binary, args, and options per call |
| `assertToolExists(client, name)` | Verify a tool is registered via `client.listTools()` |
| `assertToolCallSucceeds(client, name, args)` | Call a tool and assert no error |
| `assertToolCallFails(client, name, args)` | Call a tool and assert `isError: true` |
| `getResultText(result)` | Extract text content from MCP tool result |

### Writing a new server test

Server tests recreate the tool registration (same Zod schema and arg construction as `src/index.ts`) but inject a mock spawn instead of `secureSpawn`. This avoids importing the server module directly (which has side effects from `getToolArgs()` and `startServer()`).

```typescript
import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import { createTestServer, createMockSpawn, assertToolExists, getResultText } from "test-helpers";
import { formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

describe("my-tool-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("my-tool");

    // Mirror the tool registration from src/index.ts
    harness.server.tool("do-my-tool", "Description", {
        target: z.string(),
        ...TIMEOUT_SCHEMA,
    }, async ({ target, timeoutSeconds }, extra) => {
        const result = await mock.spawn("my-tool", [target], buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "my-tool" });
    });

    afterEach(() => mock.reset());

    it("registers the do-my-tool tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-my-tool");
        await harness.cleanup();
    });

    it("passes target to spawn", async () => {
        await harness.connect();
        await harness.client.callTool({ name: "do-my-tool", arguments: { target: "example.com" } });
        assert.deepStrictEqual(mock.lastCall()?.args, ["example.com"]);
        await harness.cleanup();
    });
});
```

## Architecture

```
AI Assistant / MCP Client
        | MCP Protocol (JSON-RPC over stdio or HTTP)
        v
MCP Server Layer (Node.js TypeScript)
  - McpServer instance from @modelcontextprotocol/sdk
  - Tool registration via server.tool()
  - Input validation via Zod schemas
  - Shared utilities from mcp-shared/
        | secureSpawn / HTTP API
        v
Security Tool Layer
  - Go binaries (alterx, amass, httpx, katana, nuclei, etc.)
  - Python scripts (commix, sqlmap, scoutsuite, arjun)
  - System binaries (nmap, masscan, sslscan)
  - HTTP APIs (crt.sh, MobSF, http-headers-security)
```

### Shared Utility Library (`packages/mcp-shared/`)

All 28 servers import from the `mcp-shared` local package:

| Module | Exports | Purpose |
|--------|---------|---------|
| `spawn.ts` | `secureSpawn()` | Spawn child processes with `stdio: ['ignore', 'pipe', 'pipe']`, 50MB output buffer limit, 5-minute default timeout, AbortSignal support for cancellation |
| `sanitize.ts` | `removeAnsiCodes()`, `truncateOutput()`, `sanitizePath()` | ANSI stripping, output truncation, path traversal prevention |
| `transport.ts` | `startServer()` | Dual stdio/HTTP transport bootstrap via `--transport` and `--port` CLI flags |
| `env.ts` | `getEnvOrArg()` | Prefer environment variables over CLI args for credentials |
| `args.ts` | `getToolArgs()` | Standardized CLI arg parsing — strips framework flags, validates min args, exits with usage on error |
| `result.ts` | `formatToolResult()` | Standardized MCP response — throws on nonzero exit, composes stdout/stderr, optional ANSI stripping |
| `timeout.ts` | `TIMEOUT_SCHEMA`, `buildSpawnOptions()` | Client-configurable execution timeout — `TIMEOUT_SCHEMA` is a Zod field to spread into tool schemas, `buildSpawnOptions()` converts `timeoutSeconds` + `extra.signal` into `SpawnOptions` |
| `loadenv.ts` | (side-effect import) | Centralized `.env` loading via dotenv — `MCP_ENV_FILE` env var for explicit path, falls back to `cwd/.env`. Auto-imported by `index.ts` barrel |

### MCP Server Pattern (all servers follow this)

Every server in `src/index.ts`:
1. Parses CLI args via `getToolArgs(usage, minArgs?)` from `mcp-shared` — strips `--transport`/`--port` flags automatically
2. Creates `McpServer` instance
3. Registers one or more tools with Zod input schemas (naming convention: `do-<tool>`), including `...TIMEOUT_SCHEMA` for client-configurable timeouts
4. Tool callbacks accept `(args, extra)` — `extra.signal` is the MCP SDK's `AbortSignal` for cancellation
5. Calls `secureSpawn()` with `buildSpawnOptions(extra, { timeoutSeconds })` from `mcp-shared` (or passes signal/timeout to HTTP calls for API-based tools)
6. Returns output via `formatToolResult(result, { toolName, includeStderr?, stripAnsi? })` — standardized error/output handling
7. Calls `startServer(server)` from `mcp-shared` for transport

### Two Execution Patterns

| Pattern | Used By | Mechanism |
|---------|---------|-----------|
| `secureSpawn` | All spawn-based tools (nmap, ffuf, httpx, nuclei, etc.) | Secure child process with stdin detached, buffer limits, client-configurable timeout, AbortSignal cancellation |
| HTTP/axios | crtsh, http-headers-security, mobsf | Direct API calls with signal/timeout passthrough, no binary spawn |

**Note:** `node-pty` is no longer used. Go tools auto-suppress ANSI in pipe mode. Python tools use `removeAnsiCodes()` from `mcp-shared`.

### Config Generation

`mcp-config.json` at the repo root is auto-generated by `start.sh`/individual `build.sh` scripts. Each build script uses `jq` to add/update its entry. Do not edit this file manually.

## Conventions

- **Directory naming:** `servers/<tool>-mcp/` (e.g., `servers/nmap-mcp`, `servers/httpx-mcp`, `servers/cero-mcp`)
- **Tool function naming:** All use `do-<tool>` (e.g., `do-nmap`, `do-ffuf`, `do-httpx`, `do-amass`)
- **TypeScript target:** ES2022, module: Node16, strict mode
- **Core deps:** `@modelcontextprotocol/sdk` ^1.17.2, `zod`, `mcp-shared` (all servers)
- **ANSI stripping:** Import `removeAnsiCodes` from `mcp-shared` (only needed for Python tools)
- **Path safety:** Use `sanitizePath()` from `mcp-shared` when handling user-supplied file paths
- **Credential handling:** Use `getEnvOrArg()` from `mcp-shared` — prefers env vars over CLI args
- **Timeout:** Every tool schema includes `...TIMEOUT_SCHEMA` for client-configurable execution timeouts (default 5 min). Use `buildSpawnOptions(extra, { timeoutSeconds })` to convert to `SpawnOptions`.
- **Cancellation:** Tool callbacks accept `extra` as second param; pass `extra.signal` to `secureSpawn` via `buildSpawnOptions()` so processes are killed when clients disconnect.
- **Error handling:** Use `formatToolResult()` — automatically throws on nonzero exitCode with stderr details
- **CLI args:** Use `getToolArgs()` instead of manual `process.argv.slice(2)` parsing
- **Logging:** `console.error` for server status (stdout reserved for MCP protocol)
- **Spawn stdin:** Always detached via `stdio: ['ignore', 'pipe', 'pipe']` — critical for ProjectDiscovery Go tools that block on pipe stdin
- **Environment config:** Servers auto-load `.env` via `loadenv.ts` (side-effect import in `mcp-shared`). Set `MCP_ENV_FILE` to specify an explicit path (useful when CWD differs from repo root). See `.env.example` for all supported variables.

## Adding a New MCP Server

1. Build `mcp-shared` first: `npm -w mcp-shared run build`
2. Create `servers/<tool>-mcp/` directory following existing structure
3. Create `tsconfig.json` with `{"extends": "../../tsconfig.base.json"}`
4. Create `package.json` with `@modelcontextprotocol/sdk` ^1.17.2, `zod`, and `"mcp-shared": "*"` (resolved via npm workspaces)
5. Implement `src/index.ts`:
 - Import `{ secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions }` from `"mcp-shared"`
 - Use `getToolArgs()` to parse CLI args (strips `--transport`/`--port` automatically)
 - Name tools with `do-<tool>` convention
 - Include `...TIMEOUT_SCHEMA` in every tool's Zod schema
 - Tool callbacks accept `(args, extra)` — destructure `timeoutSeconds` from args
 - Use `secureSpawn(binary, toolArgs, buildSpawnOptions(extra, { timeoutSeconds }))` to run the tool
 - Use `formatToolResult()` for standardized response formatting
 - Call `await startServer(server)` in `main()`
 - Add `console.error("<tool> MCP Server running")` after `startServer()`
6. Create `build.sh`: set `BIN_ARGS`, `SERVICE_PATH`, then `source "$SERVICE_PATH/../../scripts/build-common.sh"`
7. Add entry to root `README.md` tools table
8. Create the MCP server `README.md` file describing its usage and setup
9. Add tests in `src/__tests__/<tool>.test.ts` using `test-helpers` (see Testing section above)
10. Add to `package.json`: `"test": "node --test 'build/__tests__/*.test.js'"` in scripts, `"test-helpers": "*"` in devDependencies
11. Run `npm install` at repo root to link the new workspace package
12. Verify with `npm -w <tool>-mcp run build && npm -w <tool>-mcp test`

## Requirements
Use context7 for documentation
