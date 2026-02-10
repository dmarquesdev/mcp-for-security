# testssl MCP

> testssl MCP is a bridge that connects testssl.sh, the comprehensive TLS/SSL testing tool, with the Model Context Protocol (MCP) ecosystem.

## Overview

testssl MCP enables seamless integration of testssl.sh's extensive TLS/SSL assessment capabilities into MCP-compatible applications and AI-powered workflow systems. This bridge exposes six specialized tools for protocol testing, cipher analysis, vulnerability scanning, server information retrieval, and batch scanning through a standardized protocol.

## Features

- Full testssl.sh functionality exposed through MCP via 6 specialized tools
- Comprehensive TLS/SSL protocol testing (SSLv2 through TLS 1.3)
- Cipher suite analysis with multiple test modes
- Vulnerability scanning for Heartbleed, POODLE, DROWN, FREAK, BEAST, and more
- Server defaults, certificate info, and HTTP security headers
- Batch scanning support for multiple targets
- Simple configuration and setup
- Easy integration with other MCP-compatible tools and systems
- Standardized input/output handling

## Installation

### Prerequisites

- Node.js (v16 or higher)
- testssl.sh installed on your system (via git clone)
- MCP SDK

### Setup

1. Clone this repository:
 ```
 git clone https://github.com/dmarquesdev/mcp-for-security
 cd testssl-mcp
 ```

2. Install dependencies:
 ```
 npm install
 ```

3. Build the project:
 ```
 npm install && npm run build
 ```

4. Install testssl.sh (if not already installed):
 ```
 git clone https://github.com/testssl/testssl.sh.git /opt/testssl
 ```

## Usage

### Basic Configuration

Configure the testssl MCP server in your MCP client configuration:

```json
{
  "testssl-mcp": {
    "command": "node",
    "args": [
      "/path/to/testssl-mcp/build/index.js",
      "/opt/testssl/testssl.sh"
    ]
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `do-testssl` | Full comprehensive scan (all tests) |
| `do-testssl-protocols` | Test supported TLS/SSL protocol versions |
| `do-testssl-ciphers` | Analyze cipher suites (standard, per-cipher, per-proto, forward secrecy, server preference) |
| `do-testssl-vulnerabilities` | Test for specific TLS/SSL vulnerabilities |
| `do-testssl-server-info` | Retrieve server defaults, certificates, headers, and client simulation |
| `do-testssl-mass-scan` | Batch scan multiple targets from a file |

### Running testssl Tests

Once configured, you can run testssl tests through the MCP interface:

```javascript
// Full comprehensive scan
const result = await mcp.tools.invoke("do-testssl", {
  target: "example.com:443"
});
```

## Examples

### Full TLS/SSL Assessment

```javascript
const result = await mcp.tools.invoke("do-testssl", {
  target: "https://example.com",
  severity: "LOW"
});
```

### Protocol Version Check

```javascript
const result = await mcp.tools.invoke("do-testssl-protocols", {
  target: "example.com:443"
});
```

### Cipher Suite Analysis

```javascript
const result = await mcp.tools.invoke("do-testssl-ciphers", {
  target: "example.com:443",
  test_mode: "standard"
});
```

### Vulnerability Scan (Specific)

```javascript
const result = await mcp.tools.invoke("do-testssl-vulnerabilities", {
  target: "example.com:443",
  heartbleed: true,
  poodle: true,
  drown: true
});
```

### Server Defaults and Headers

```javascript
const result = await mcp.tools.invoke("do-testssl-server-info", {
  target: "example.com:443",
  server_defaults: true,
  headers: true
});
```

### STARTTLS for Email Servers

```javascript
const result = await mcp.tools.invoke("do-testssl", {
  target: "mail.example.com:25",
  starttls: "smtp"
});
```

### Batch Scan from File

```javascript
const result = await mcp.tools.invoke("do-testssl-mass-scan", {
  file_path: "/path/to/targets.txt",
  mode: "parallel",
  jsonfile: "/path/to/results.json"
});
```

## Integration with AI Assistants

testssl MCP is designed to work seamlessly with AI assistants that support the Model Context Protocol, enabling natural language interactions for TLS/SSL security testing tasks.

Example conversation with an AI assistant:

```
User: Check the TLS configuration of example.com for vulnerabilities
AI: I'll help you analyze the TLS configuration of example.com using testssl.sh.

[AI uses testssl MCP to run the assessment and returns the results]

testssl.sh results for example.com:
- TLSv1.0 is disabled
- TLSv1.3 is supported
- Forward secrecy is supported
- No Heartbleed vulnerability detected
- No POODLE vulnerability detected
- Certificate is valid and trusted
...
```

## Security Considerations

- Always obtain proper authorization before testing websites
- Use responsibly and ethically
- Some tests may be logged by the target server's security monitoring systems
- The `--phone-out` option enables DNS lookups to external services — use with care

## Troubleshooting

If you encounter issues:

1. Verify testssl.sh is properly installed and accessible
2. Check the path to testssl.sh in your configuration
3. Ensure proper permissions are set for execution (`chmod +x testssl.sh`)
4. Ensure openssl is installed (testssl.sh depends on it)
5. Review server logs for detailed error messages

## Acknowledgments

- testssl.sh Project: https://github.com/testssl/testssl.sh
- Model Context Protocol: https://github.com/modelcontextprotocol
