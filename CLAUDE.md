# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A monorepo of 28 MCP (Model Context Protocol) server implementations that wrap popular cybersecurity tools. Each server exposes security tools as MCP tools over stdio or HTTP transport, enabling AI assistants to invoke them. A shared utility library (`mcp-shared/`) provides secure spawn, path sanitization, ANSI stripping, and dual-transport bootstrap. Originally created by [Cyprox](https://cyprox.io), independently maintained fork.

## Build Commands

### Build the shared library (must be built first)
```bash
cd mcp-shared && npm install && npm run build
```
All servers depend on `mcp-shared` via `"file:../mcp-shared"`. Build it before building any server.

### Build a single MCP server
```bash
cd <tool>-mcp && npm install && npm run build
```
`npm run build` runs `tsc` to compile TypeScript from `src/` to `build/index.js`.

### Build a single server with its tool dependencies
```bash
cd <tool>-mcp && ./build.sh
```
Each `build.sh` installs the underlying security tool (Go binary, Python package, etc.), runs `npm install && npm run build`, and updates the root `mcp-config.json` via `jq`.

### Build all servers (used in Docker)
```bash
./start.sh
```
Iterates all `*-mcp/` directories, runs each `build.sh`, then generates the unified `mcp-config.json`.

### Docker build (per-server images with Nginx gateway)
```bash
docker compose build                          # Build all images
docker compose up                             # Start gateway + all 28 servers
docker compose up gateway nmap httpx nuclei    # Start gateway + specific tools
```
Per-server multi-stage Docker images behind an Nginx gateway at `localhost:8080`. Each tool runs in its own container on internal port 3000. Gateway routes by URL path (e.g. `http://localhost:8080/nmap`).

### Generate gateway-aware client config
```bash
./scripts/generate-http-config.sh             # Produces mcp-config.json with gateway URLs
```

## Running an MCP Server

### Stdio transport (default)
```bash
node <tool>-mcp/build/index.js <binary-path> [additional-args]
```
Example: `node nmap-mcp/build/index.js nmap`

### HTTP transport
```bash
node <tool>-mcp/build/index.js <binary-path> --transport http --port 3001
```
All servers support both stdio and HTTP transport via `startServer()` from `mcp-shared`.

### MCP client configuration (stdio)
```json
{
  "mcpServers": {
    "nmap-mcp": {
      "command": "node",
      "args": ["/path/to/nmap-mcp/build/index.js", "nmap"]
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
cd <tool>-mcp && npm install && npm run build && npm test
```
Requires `mcp-shared` and `test-helpers` to be built first.

### Run mcp-shared tests only
```bash
cd mcp-shared && npm run build && npm test
```

### Run integration tests only
```bash
cd test-integration && npm install && npm run build && npm test
```

### Test architecture (three tiers)

| Tier | Location | What it tests | Mechanism |
|------|----------|---------------|-----------|
| Unit | `mcp-shared/src/__tests__/` | All 6 shared modules (spawn, args, env, sanitize, result, transport) | Real commands (`echo`, `node -e`) for spawn; `process.argv`/`process.env` manipulation for args/env |
| Server | `<tool>-mcp/src/__tests__/` | Tool registration, Zod schemas, arg construction, response formatting | `InMemoryTransport` + mock `secureSpawn` — no real security tools needed |
| Integration | `test-integration/src/` | Full MCP protocol cycle with real `secureSpawn` | `InMemoryTransport` with real `echo` command |

### Test helpers (`test-helpers/`)

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
import { formatToolResult } from "mcp-shared";

describe("my-tool-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("my-tool");

    // Mirror the tool registration from src/index.ts
    harness.server.tool("do-my-tool", "Description", {
        target: z.string(),
    }, async ({ target }) => {
        const result = await mock.spawn("my-tool", [target]);
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

### Shared Utility Library (`mcp-shared/`)

All 28 servers import from the `mcp-shared` local package:

| Module | Exports | Purpose |
|--------|---------|---------|
| `spawn.ts` | `secureSpawn()` | Spawn child processes with `stdio: ['ignore', 'pipe', 'pipe']`, 50MB output buffer limit, 5-minute timeout |
| `sanitize.ts` | `removeAnsiCodes()`, `truncateOutput()`, `sanitizePath()` | ANSI stripping, output truncation, path traversal prevention |
| `transport.ts` | `startServer()` | Dual stdio/HTTP transport bootstrap via `--transport` and `--port` CLI flags |
| `env.ts` | `getEnvOrArg()` | Prefer environment variables over CLI args for credentials |
| `args.ts` | `getToolArgs()` | Standardized CLI arg parsing — strips framework flags, validates min args, exits with usage on error |
| `result.ts` | `formatToolResult()` | Standardized MCP response — throws on nonzero exit, composes stdout/stderr, optional ANSI stripping |

### MCP Server Pattern (all servers follow this)

Every server in `src/index.ts`:
1. Parses CLI args via `getToolArgs(usage, minArgs?)` from `mcp-shared` — strips `--transport`/`--port` flags automatically
2. Creates `McpServer` instance
3. Registers one or more tools with Zod input schemas (naming convention: `do-<tool>`)
4. Calls `secureSpawn()` from `mcp-shared` (or makes HTTP calls for API-based tools)
5. Returns output via `formatToolResult(result, { toolName, includeStderr?, stripAnsi? })` — standardized error/output handling
6. Calls `startServer(server)` from `mcp-shared` for transport

### Two Execution Patterns

| Pattern | Used By | Mechanism |
|---------|---------|-----------|
| `secureSpawn` | All spawn-based tools (nmap, ffuf, httpx, nuclei, etc.) | Secure child process with stdin detached, buffer limits, timeout |
| HTTP/axios | crtsh, http-headers-security, mobsf | Direct API calls, no binary spawn |

**Note:** `node-pty` is no longer used. Go tools auto-suppress ANSI in pipe mode. Python tools use `removeAnsiCodes()` from `mcp-shared`.

### Config Generation

`mcp-config.json` at the repo root is auto-generated by `start.sh`/individual `build.sh` scripts. Each build script uses `jq` to add/update its entry. Do not edit this file manually.

## Conventions

- **Directory naming:** `<tool>-mcp/` (e.g., `nmap-mcp`, `httpx-mcp`, `cero-mcp`)
- **Tool function naming:** All use `do-<tool>` (e.g., `do-nmap`, `do-ffuf`, `do-httpx`, `do-amass`)
- **TypeScript target:** ES2022, module: Node16, strict mode
- **Core deps:** `@modelcontextprotocol/sdk` ^1.17.2, `zod`, `mcp-shared` (all servers)
- **ANSI stripping:** Import `removeAnsiCodes` from `mcp-shared` (only needed for Python tools)
- **Path safety:** Use `sanitizePath()` from `mcp-shared` when handling user-supplied file paths
- **Credential handling:** Use `getEnvOrArg()` from `mcp-shared` — prefers env vars over CLI args
- **Error handling:** Use `formatToolResult()` — automatically throws on nonzero exitCode with stderr details
- **CLI args:** Use `getToolArgs()` instead of manual `process.argv.slice(2)` parsing
- **Logging:** `console.error` for server status (stdout reserved for MCP protocol)
- **Spawn stdin:** Always detached via `stdio: ['ignore', 'pipe', 'pipe']` — critical for ProjectDiscovery Go tools that block on pipe stdin

## Adding a New MCP Server

1. Build `mcp-shared` first: `cd mcp-shared && npm install && npm run build`
2. Create `<tool>-mcp/` directory following existing structure
3. Copy `tsconfig.json` from any existing server (they're identical)
4. Create `package.json` with `@modelcontextprotocol/sdk` ^1.17.2, `zod`, and `"mcp-shared": "file:../mcp-shared"`
5. Implement `src/index.ts`:
 - Import `{ secureSpawn, startServer, getToolArgs, formatToolResult }` from `"mcp-shared"`
 - Use `getToolArgs()` to parse CLI args (strips `--transport`/`--port` automatically)
 - Name tools with `do-<tool>` convention
 - Use `secureSpawn()` to run the tool (or axios for API-based tools)
 - Use `formatToolResult()` for standardized response formatting
 - Call `await startServer(server)` in `main()`
6. Create `build.sh`: set `BIN_ARGS`, `SERVICE_PATH`, then `source scripts/build-common.sh`
7. Add entry to root `readme.md` tools table
8. Add the `.gitignore` file to make sure bloated files are not committed
9. Create the MCP server `readme.md` file describing its usage and setup
10. Add tests in `src/__tests__/<tool>.test.ts` using `test-helpers` (see Testing section above)
11. Add to `package.json`: `"test": "node --test 'build/__tests__/*.test.js'"` in scripts, `"test-helpers": "file:../test-helpers"` in devDependencies
12. Verify with `npm run build && npm test`

## Requirements
Use context7 for documentation
