# urldedupe MCP Server

MCP server wrapping [urldedupe](https://github.com/ameenmaali/urldedupe), a C++ tool for removing duplicate URLs based on URL and query parameter combinations.

## Prerequisites

- CMake
- C++ compiler (g++ or clang++)
- make
- urldedupe: build from source (see build.sh)

## Setup

```bash
# Build the server
./build.sh

# Or manually
npm install && npm run build
```

## Usage

### Stdio transport (default)

```bash
node build/index.js urldedupe
```

### HTTP transport

```bash
node build/index.js urldedupe --transport http --port 3001
```

### MCP client configuration

```json
{
  "mcpServers": {
    "urldedupe-mcp": {
      "command": "node",
      "args": ["/path/to/servers/urldedupe-mcp/build/index.js", "urldedupe"]
    }
  }
}
```

## Tool: do-urldedupe

Deduplicates a list of URLs by removing redundant URL and query parameter combinations.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `urls` | string[] | Yes | URLs to deduplicate (passed via stdin) |
| `regex_parse` | boolean | No | Use regex-based URL parsing instead of standard |
| `similar` | boolean | No | Filter out similar URLs with matching query parameter keys |
| `query_strings_only` | boolean | No | Only consider URLs with query strings |
| `no_extensions` | boolean | No | Filter out URLs with common media/resource extensions |
| `timeoutSeconds` | number | No | MCP process timeout in seconds (default: 300) |

### Example

```json
{
  "name": "do-urldedupe",
  "arguments": {
    "urls": [
      "https://example.com/page?id=1",
      "https://example.com/page?id=2",
      "https://example.com/other?id=1",
      "https://example.com/page?id=3"
    ],
    "similar": true
  }
}
```

## Example Prompts

These are natural language prompts a user can give to an AI agent to trigger this tool:

- "Deduplicate these URLs I collected from gau and remove redundant query parameter variations"
- "Use urldedupe to filter out similar URLs from this list keeping only unique parameter combinations"
- "Clean up this URL list by removing duplicates and URLs with media extensions"
- "Take the output from waybackurls and deduplicate it, only keeping URLs with query strings"
- "Remove duplicate URLs from this list using regex-based parsing for better accuracy"

## Note on stdin

Like hakrawler and gau, urldedupe reads URLs from stdin rather than CLI arguments. This server uses the `stdinData` option in `secureSpawn` to pipe URLs to the process.
