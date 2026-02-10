# GitHub Subdomains MCP

> GitHub Subdomains MCP is a bridge that connects [github-subdomains](https://github.com/gwen001/github-subdomains), a tool that discovers subdomains by searching GitHub code, with the Model Context Protocol (MCP) ecosystem.

## Overview

GitHub Subdomains MCP enables seamless integration of github-subdomains' GitHub code search capabilities into MCP-compatible applications and AI-powered workflow systems. This bridge exposes a single tool for discovering subdomains by querying the GitHub Search API for code containing references to a target domain.

## Features

- Full github-subdomains functionality exposed through MCP
- Subdomain discovery via GitHub code search
- GitHub token configured at server level via CLI args (optional — falls back to `GITHUB_TOKEN` env var)
- Support for multiple GitHub tokens (comma-separated or file path)
- Extended search mode for broader results
- Raw unfiltered output option
- Rate-limit aware with exit-on-rate-limit option
- Simple configuration and setup
- Easy integration with other MCP-compatible tools and systems
- Standardized input/output handling

## Installation

### Prerequisites

- Node.js (v16 or higher)
- github-subdomains installed on your system (Go binary)
- A GitHub personal access token
- MCP SDK

### Setup

1. Clone this repository:
 ```
 git clone https://github.com/dmarquesdev/mcp-for-security
 cd github-subdomains-mcp
 ```

2. Install dependencies:
 ```
 npm install
 ```

3. Build the project:
 ```
 npm install && npm run build
 ```

4. Install github-subdomains (if not already installed):
 ```
 go install github.com/gwen001/github-subdomains@latest
 ```

## Usage

### Basic Configuration

Configure the GitHub Subdomains MCP server in your MCP client configuration:

```json
{
  "github-subdomains-mcp": {
    "command": "node",
    "args": [
      "/path/to/github-subdomains-mcp/build/index.js",
      "github-subdomains",
      "ghp_yourtoken"
    ]
  }
}
```

> **Note:** The GitHub token is optional. If omitted, the tool falls back to the `GITHUB_TOKEN` environment variable. You can provide a single token, comma-separated tokens, or a path to a file containing tokens.

### Available Tools

| Tool | Description |
|------|-------------|
| `github-subdomains` | Discover subdomains by searching GitHub code using the GitHub API |

### Tool Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `domain` | string | Yes | Target domain to find subdomains for (e.g., example.com) |
| `extended` | boolean | No | Extended search mode for broader results |
| `exit_on_rate_limit` | boolean | No | Exit when all tokens are rate-limited |
| `raw` | boolean | No | Display raw unfiltered results |

### Running GitHub Subdomains Scans

Once configured, you can run scans through the MCP interface:

```javascript
// Basic subdomain discovery (token is configured at the server level)
const result = await mcp.tools.invoke("github-subdomains", {
  domain: "example.com"
});
```

## Examples

### Basic Subdomain Discovery

```javascript
const result = await mcp.tools.invoke("github-subdomains", {
  domain: "example.com"
});
```

### Extended Search

```javascript
const result = await mcp.tools.invoke("github-subdomains", {
  domain: "example.com",
  extended: true
});
```

### Raw Output with Rate Limit Handling

```javascript
const result = await mcp.tools.invoke("github-subdomains", {
  domain: "example.com",
  raw: true,
  exit_on_rate_limit: true
});
```

## Integration with AI Assistants

GitHub Subdomains MCP is designed to work seamlessly with AI assistants that support the Model Context Protocol, enabling natural language interactions for subdomain discovery tasks.

Example conversation with an AI assistant:

```
User: Find subdomains of example.com using GitHub code search
AI: I'll search GitHub code for subdomains of example.com.

[AI uses GitHub Subdomains MCP to run the scan and returns the results]

GitHub Subdomains results for example.com:
- api.example.com
- dev.example.com
- staging.example.com
- internal.example.com
...
```

## Security Considerations

- Always obtain proper authorization before enumerating subdomains
- Use responsibly and ethically
- GitHub tokens should be kept secure and never committed to repositories
- Consider using multiple tokens to avoid rate limiting
- The tool queries public GitHub code only

## Troubleshooting

If you encounter issues:

1. Verify github-subdomains is properly installed and accessible
2. Check the path to the github-subdomains executable in your configuration
3. Ensure your GitHub token is valid and has appropriate permissions
4. Review server logs for detailed error messages
5. If rate-limited, wait or use multiple tokens

## Acknowledgments

- github-subdomains Project: https://github.com/gwen001/github-subdomains
- Model Context Protocol: https://github.com/modelcontextprotocol
