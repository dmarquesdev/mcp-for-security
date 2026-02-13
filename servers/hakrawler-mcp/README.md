# hakrawler MCP Server

MCP server wrapping [hakrawler](https://github.com/hakluke/hakrawler), a fast Go-based web crawler for discovering endpoints, links, and JavaScript references.

## Prerequisites

- [Go](https://golang.org/) 1.21+
- hakrawler: `go install github.com/hakluke/hakrawler@latest`

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
node build/index.js hakrawler
```

### HTTP transport

```bash
node build/index.js hakrawler --transport http --port 3001
```

### MCP client configuration

```json
{
  "mcpServers": {
    "hakrawler-mcp": {
      "command": "node",
      "args": ["/path/to/servers/hakrawler-mcp/build/index.js", "hakrawler"]
    }
  }
}
```

## Tool: do-hakrawler

Crawls web pages to discover endpoints, links, and JavaScript references.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `urls` | string[] | Yes | Target URLs to crawl (passed via stdin) |
| `depth` | number | No | Crawl depth (default: 2) |
| `disable_redirects` | boolean | No | Disable following HTTP redirects |
| `headers` | string | No | Custom headers separated by `;;` |
| `inside_path` | boolean | No | Only crawl inside the URL path |
| `insecure` | boolean | No | Disable TLS verification |
| `json` | boolean | No | Output as JSON |
| `proxy` | string | No | Proxy URL |
| `show_source` | boolean | No | Show source of each discovered URL |
| `page_size_limit` | number | No | Page size limit in KB (default: -1) |
| `include_subs` | boolean | No | Include subdomains |
| `threads` | number | No | Number of threads (default: 8) |
| `url_timeout` | number | No | Max seconds per URL (default: -1) |
| `unique` | boolean | No | Show only unique URLs |
| `show_where` | boolean | No | Show where each URL was found |
| `timeoutSeconds` | number | No | MCP process timeout in seconds (default: 300) |

### Example

```json
{
  "name": "do-hakrawler",
  "arguments": {
    "urls": ["https://example.com"],
    "depth": 3,
    "unique": true,
    "json": true
  }
}
```

## Example Prompts

These are natural language prompts a user can give to an AI agent to trigger this tool:

- "Crawl https://example.com and list all the endpoints you find"
- "Use hakrawler to discover JavaScript files and API endpoints on https://target.com with depth 3"
- "Crawl https://app.example.com including subdomains and show only unique URLs"
- "Run hakrawler on https://example.com through my Burp proxy at http://127.0.0.1:8080"
- "Discover all links on https://example.com and https://other.com, output as JSON, and show where each URL was found"

## Note on stdin

Unlike most tools in this repository, hakrawler reads target URLs from stdin rather than CLI arguments. This server uses the `stdinData` option in `secureSpawn` to pipe URLs to the process.
