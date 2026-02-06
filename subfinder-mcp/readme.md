# Subfinder MCP

> Subfinder MCP is a bridge that connects Subfinder, the fast passive subdomain enumeration tool, with the Model Context Protocol (MCP) ecosystem.

## Overview

Subfinder MCP enables seamless integration of Subfinder's passive subdomain discovery capabilities into MCP-compatible applications and AI-powered workflow systems. This bridge exposes a single powerful tool for enumerating valid subdomains using online passive sources without active probing, through a standardized protocol.

## Features

- Full Subfinder functionality exposed through MCP
- Passive subdomain enumeration using online sources (crt.sh, Shodan, VirusTotal, etc.)
- Source selection and exclusion for targeted enumeration
- Recursive subdomain discovery
- Active subdomain verification with DNS resolution
- IP address resolution for discovered subdomains
- JSON output with source attribution
- Subdomain pattern matching and filtering
- Custom DNS resolvers support
- Rate limiting and timeout controls
- Simple configuration and setup
- Easy integration with other MCP-compatible tools and systems
- Standardized input/output handling

## Installation

### Prerequisites

- Node.js (v16 or higher)
- Subfinder installed on your system (Go binary)
- MCP SDK

### Setup

1. Clone this repository:
 ```
 git clone https://github.com/cyproxio/mcp-for-security
 cd subfinder-mcp
 ```

2. Install dependencies:
 ```
 npm install
 ```

3. Build the project:
 ```
 npm install && npm run build
 ```

4. Install Subfinder (if not already installed):
 ```
 go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
 ```

## Usage

### Basic Configuration

Configure the Subfinder MCP server in your MCP client configuration:

```json
{
  "subfinder-mcp": {
    "command": "node",
    "args": [
      "/path/to/subfinder-mcp/build/index.js",
      "subfinder"
    ]
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `subfinder` | Fast passive subdomain enumeration using online passive sources |

### Tool Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | Target domain to enumerate subdomains for (e.g., example.com) |
| `sources` | string[] | No | Specific sources to use (e.g., crtsh, shodan, virustotal) |
| `exclude_sources` | string[] | No | Sources to exclude from enumeration |
| `all` | boolean | No | Use all sources (includes API-dependent sources) |
| `recursive` | boolean | No | Use recursive enumeration on discovered subdomains |
| `json` | boolean | No | Output in JSON Lines format |
| `active` | boolean | No | Display only active subdomains (performs DNS resolution) |
| `collect_sources` | boolean | No | Include source information in JSON output |
| `ip` | boolean | No | Include IP addresses in output |
| `timeout` | number | No | Timeout in seconds for enumeration |
| `rate_limit` | number | No | Maximum number of HTTP requests per second |
| `resolvers` | string[] | No | Custom DNS resolvers to use (e.g., 8.8.8.8, 1.1.1.1) |
| `match` | string[] | No | Match subdomain patterns to include |
| `filter` | string[] | No | Filter out subdomain patterns to exclude |
| `verbose` | boolean | No | Show verbose output with additional details |

### Running Subfinder Scans

Once configured, you can run Subfinder scans through the MCP interface:

```javascript
// Basic subdomain enumeration
const result = await mcp.tools.invoke("subfinder", {
  domain: "example.com"
});
```

## Examples

### Basic Subdomain Enumeration

```javascript
const result = await mcp.tools.invoke("subfinder", {
  domain: "example.com"
});
```

### Enumeration with Specific Sources

```javascript
const result = await mcp.tools.invoke("subfinder", {
  domain: "example.com",
  sources: ["crtsh", "shodan", "virustotal"],
  exclude_sources: ["github"]
});
```

### Recursive Discovery with All Sources

```javascript
const result = await mcp.tools.invoke("subfinder", {
  domain: "example.com",
  all: true,
  recursive: true,
  timeout: 30
});
```

### Active Verification with IP Resolution

```javascript
const result = await mcp.tools.invoke("subfinder", {
  domain: "example.com",
  active: true,
  ip: true,
  resolvers: ["8.8.8.8", "1.1.1.1"]
});
```

### JSON Output with Source Collection

```javascript
const result = await mcp.tools.invoke("subfinder", {
  domain: "example.com",
  json: true,
  collect_sources: true,
  verbose: true
});
```

### Filtered Enumeration

```javascript
const result = await mcp.tools.invoke("subfinder", {
  domain: "example.com",
  match: ["api", "dev"],
  filter: ["test", "staging"],
  rate_limit: 10
});
```

## Integration with AI Assistants

Subfinder MCP is designed to work seamlessly with AI assistants that support the Model Context Protocol, enabling natural language interactions for subdomain enumeration tasks.

Example conversation with an AI assistant:

```
User: Find all subdomains of example.com
AI: I'll help you discover subdomains using Subfinder's passive enumeration.

[AI uses Subfinder MCP to run the scan and returns the results]

Subfinder results for example.com:
- api.example.com
- blog.example.com
- dev.example.com
- mail.example.com
- staging.example.com
...
```

## Security Considerations

- Always obtain proper authorization before enumerating subdomains
- Use responsibly and ethically
- Subfinder uses passive sources by default, but the `active` flag performs DNS resolution which may be logged
- API-dependent sources (enabled with `all`) may require API keys configured in Subfinder's provider config
- Consider rate limiting to avoid being blocked by passive sources

## Troubleshooting

If you encounter issues:

1. Verify Subfinder is properly installed and accessible
2. Check the path to the Subfinder executable in your configuration
3. Ensure proper permissions are set for execution
4. Review server logs for detailed error messages
5. For API-dependent sources, verify API keys are configured in `~/.config/subfinder/provider-config.yaml`

## Acknowledgments

- Subfinder Project: https://github.com/projectdiscovery/subfinder
- Model Context Protocol: https://github.com/modelcontextprotocol
