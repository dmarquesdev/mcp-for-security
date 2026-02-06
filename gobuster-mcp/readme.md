# Gobuster MCP

> Gobuster MCP is a bridge that connects Gobuster, the fast directory/file, DNS, vhost, S3, GCS, and TFTP brute-forcing tool, with the Model Context Protocol (MCP) ecosystem.

## Overview

Gobuster MCP enables seamless integration of Gobuster's brute-forcing capabilities into MCP-compatible applications and AI-powered workflow systems. This bridge exposes seven specialized tools covering directory enumeration, DNS subdomain discovery, virtual host detection, URL fuzzing, S3/GCS bucket enumeration, and TFTP discovery through a standardized protocol.

## Features

- Full Gobuster functionality exposed through MCP via 7 specialized tools
- Directory and file brute-forcing with extensive filtering options
- DNS subdomain enumeration
- Virtual host discovery
- URL fuzzing with FUZZ keyword support
- AWS S3 and Google Cloud Storage bucket enumeration
- TFTP server enumeration
- Simple configuration and setup
- Easy integration with other MCP-compatible tools and systems
- Standardized input/output handling

## Installation

### Prerequisites

- Node.js (v16 or higher)
- Gobuster installed on your system (Go binary)
- MCP SDK

### Setup

1. Clone this repository:
 ```
 git clone https://github.com/cyproxio/mcp-for-security
 cd gobuster-mcp
 ```

2. Install dependencies:
 ```
 npm install
 ```

3. Build the project:
 ```
 npm install && npm run build
 ```

4. Install Gobuster (if not already installed):
 ```
 go install github.com/OJ/gobuster/v3@latest
 ```

## Usage

### Basic Configuration

Configure the Gobuster MCP server in your MCP client configuration:

```json
{
  "gobuster-mcp": {
    "command": "node",
    "args": [
      "/path/to/gobuster-mcp/build/index.js",
      "gobuster"
    ]
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `do-gobuster-dir` | Brute-force directories and files on a web server |
| `do-gobuster-dns` | Enumerate DNS subdomains |
| `do-gobuster-vhost` | Discover virtual hosts on a web server |
| `do-gobuster-fuzz` | Fuzz URLs using the FUZZ keyword |
| `do-gobuster-s3` | Enumerate AWS S3 buckets |
| `do-gobuster-gcs` | Enumerate Google Cloud Storage buckets |
| `do-gobuster-tftp` | Enumerate TFTP servers |

### Running Gobuster Scans

Once configured, you can run Gobuster scans through the MCP interface:

```javascript
// Directory brute-forcing
const result = await mcp.tools.invoke("do-gobuster-dir", {
  url: "http://example.com",
  wordlist: "/path/to/wordlist.txt"
});
```

## Examples

### Directory Brute-Forcing

```javascript
const result = await mcp.tools.invoke("do-gobuster-dir", {
  url: "http://example.com",
  wordlist: "/usr/share/wordlists/dirb/common.txt",
  extensions: "php,html,txt",
  threads: 50
});
```

### DNS Subdomain Enumeration

```javascript
const result = await mcp.tools.invoke("do-gobuster-dns", {
  domain: "example.com",
  wordlist: "/usr/share/wordlists/subdomains.txt",
  show_ips: true,
  show_cname: true
});
```

### Virtual Host Discovery

```javascript
const result = await mcp.tools.invoke("do-gobuster-vhost", {
  url: "http://example.com",
  wordlist: "/path/to/vhosts.txt",
  append_domain: true
});
```

### URL Fuzzing

```javascript
const result = await mcp.tools.invoke("do-gobuster-fuzz", {
  url: "http://example.com/FUZZ",
  wordlist: "/path/to/wordlist.txt",
  exclude_status_codes: "404,403"
});
```

### S3 Bucket Enumeration

```javascript
const result = await mcp.tools.invoke("do-gobuster-s3", {
  wordlist: "/path/to/buckets.txt",
  threads: 20
});
```

## Integration with AI Assistants

Gobuster MCP is designed to work seamlessly with AI assistants that support the Model Context Protocol, enabling natural language interactions for brute-forcing and enumeration tasks.

Example conversation with an AI assistant:

```
User: Find hidden directories on http://example.com
AI: I'll help you discover hidden directories using Gobuster.

[AI uses Gobuster MCP to run the scan and returns the results]

Gobuster results for http://example.com:
- /admin (Status: 301)
- /api (Status: 200)
- /backup (Status: 403)
- /config (Status: 403)
...
```

## Security Considerations

- Always obtain proper authorization before brute-forcing websites
- Use responsibly and ethically
- Brute-forcing can generate significant traffic and may be detected by security systems
- Consider using appropriate thread counts to avoid overwhelming target servers

## Troubleshooting

If you encounter issues:

1. Verify Gobuster is properly installed and accessible
2. Check the path to the Gobuster executable in your configuration
3. Ensure proper permissions are set for execution
4. Review server logs for detailed error messages
5. Verify wordlist files exist at the specified paths

## Acknowledgments

- Gobuster Project: https://github.com/OJ/gobuster
- Model Context Protocol: https://github.com/modelcontextprotocol
