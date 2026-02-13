# gau MCP Server

MCP server wrapping [gau](https://github.com/lc/gau) (Get All URLs), a tool that fetches known URLs from AlienVault OTX, Wayback Machine, Common Crawl, and URLScan.

## Prerequisites

- [Go](https://golang.org/) 1.21+
- gau: `go install github.com/lc/gau/v2/cmd/gau@latest`

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
node build/index.js gau
```

### HTTP transport

```bash
node build/index.js gau --transport http --port 3001
```

### MCP client configuration

```json
{
  "mcpServers": {
    "gau-mcp": {
      "command": "node",
      "args": ["/path/to/servers/gau-mcp/build/index.js", "gau"]
    }
  }
}
```

## Tool: do-gau

Fetches known URLs for domains from AlienVault OTX, Wayback Machine, Common Crawl, and URLScan.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `targets` | string[] | Yes | Target domains to fetch URLs for |
| `providers` | string[] | No | URL sources (wayback, otx, commoncrawl, urlscan) |
| `blacklist` | string[] | No | Extensions to skip (e.g., jpg, png, gif) |
| `include_subs` | boolean | No | Include subdomains |
| `json` | boolean | No | Output as JSON |
| `match_status_codes` | string | No | Only include URLs with these status codes |
| `filter_status_codes` | string | No | Exclude URLs with these status codes |
| `match_mime_types` | string | No | Only include URLs with these MIME types |
| `filter_mime_types` | string | No | Exclude URLs with these MIME types |
| `from` | string | No | Start date (YYYYMM format) |
| `to` | string | No | End date (YYYYMM format) |
| `remove_duplicates` | boolean | No | Remove duplicate URLs |
| `threads` | number | No | Number of threads |
| `proxy` | string | No | HTTP proxy URL |
| `retries` | number | No | Number of HTTP retries |
| `request_timeout` | number | No | Per-request timeout in seconds (gau's --timeout) |
| `verbose` | boolean | No | Show verbose output |
| `timeoutSeconds` | number | No | MCP process timeout in seconds (default: 300) |

### Example

```json
{
  "name": "do-gau",
  "arguments": {
    "targets": ["example.com"],
    "providers": ["wayback", "otx"],
    "include_subs": true,
    "blacklist": ["jpg", "png", "gif", "css"]
  }
}
```

## Example Prompts

These are natural language prompts a user can give to an AI agent to trigger this tool:

- "Find all known URLs for example.com using gau"
- "Use gau to enumerate URLs for target.com from the Wayback Machine and OTX, excluding image files"
- "Get all URLs for example.com including subdomains, only showing pages that returned 200 status"
- "Run gau on example.com and test.com to discover historical endpoints from 2023"
- "Fetch known URLs for app.example.com through my proxy at http://127.0.0.1:8080 and output as JSON"
