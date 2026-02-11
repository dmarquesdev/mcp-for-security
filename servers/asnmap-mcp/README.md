# Asnmap MCP

> Asnmap MCP is a bridge that connects asnmap, ProjectDiscovery's ASN to CIDR mapping tool, with the Model Context Protocol (MCP) ecosystem.

## Overview

Asnmap MCP enables seamless integration of asnmap's ASN mapping capabilities into MCP-compatible applications and AI-powered workflow systems. This bridge exposes a single powerful tool for mapping Autonomous System Numbers (ASNs) to CIDR ranges using IP, domain, ASN, or organization lookups, through a standardized protocol.

## Features

- Full asnmap functionality exposed through MCP
- ASN to CIDR range mapping
- IP address to ASN lookup
- Domain to network range resolution
- Organization name to network range resolution
- JSON and CSV output formats
- IPv6 CIDR range support
- Custom DNS resolvers
- Simple configuration and setup
- Easy integration with other MCP-compatible tools and systems
- Standardized input/output handling

## Installation

### Prerequisites

- Node.js (v16 or higher)
- asnmap installed on your system (Go binary)
- MCP SDK
- ProjectDiscovery Cloud Platform API key (`PDCP_API_KEY`)

### Setup

1. Clone this repository:
 ```
 git clone https://github.com/dmarquesdev/mcp-for-security
 cd servers/asnmap-mcp
 ```

2. Install dependencies:
 ```
 npm install
 ```

3. Build the project:
 ```
 npm install && npm run build
 ```

4. Install asnmap (if not already installed):
 ```
 go install github.com/projectdiscovery/asnmap/cmd/asnmap@latest
 ```

5. Set your API key:
 ```
 export PDCP_API_KEY=your_api_key_here
 ```

## Usage

### Basic Configuration

Configure the Asnmap MCP server in your MCP client configuration:

```json
{
  "asnmap-mcp": {
    "command": "node",
    "args": [
      "/path/to/servers/asnmap-mcp/build/index.js",
      "asnmap"
    ]
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `do-asnmap` | Map ASN data to CIDR ranges using ASN, IP, domain, or organization lookups |

### Tool Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `asn` | string | No* | ASN to lookup (e.g., AS14421) |
| `ip` | string | No* | IP address to lookup |
| `domain` | string | No* | Domain name to lookup |
| `org` | string | No* | Organization name to lookup |
| `json` | boolean | No | Output in JSON format |
| `csv` | boolean | No | Output in CSV format |
| `ipv6` | boolean | No | Include IPv6 CIDR ranges |
| `resolvers` | string | No | Custom resolver list (comma-separated) |

*At least one of `asn`, `ip`, `domain`, or `org` must be provided.

## Examples

### ASN Lookup

```javascript
const result = await mcp.tools.invoke("do-asnmap", {
  asn: "AS13335"
});
```

### IP Address Lookup

```javascript
const result = await mcp.tools.invoke("do-asnmap", {
  ip: "1.1.1.1"
});
```

### Domain Lookup with JSON Output

```javascript
const result = await mcp.tools.invoke("do-asnmap", {
  domain: "cloudflare.com",
  json: true
});
```

### Organization Lookup with IPv6

```javascript
const result = await mcp.tools.invoke("do-asnmap", {
  org: "Cloudflare",
  ipv6: true
});
```

## Security Considerations

- Always obtain proper authorization before performing network reconnaissance
- Use responsibly and ethically
- asnmap queries public ASN databases but the information can be used to map network infrastructure
- A `PDCP_API_KEY` environment variable is required for the ProjectDiscovery Cloud Platform API
- Consider the sensitivity of the network intelligence gathered

## Acknowledgments

- asnmap Project: https://github.com/projectdiscovery/asnmap
- Model Context Protocol: https://github.com/modelcontextprotocol
