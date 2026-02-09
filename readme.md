# MCP for Security

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Stars](https://img.shields.io/github/stars/cyproxio/mcp-for-security?style=social)](https://github.com/cyproxio/mcp-for-security/stargazers)
[![Docker](https://img.shields.io/github/release/cyproxio/mcp-for-security?style=social)](https://github.com/cyproxio/mcp-for-security/releases)
---

<img src="https://avatars.githubusercontent.com/u/89649708?s=48&v=4" width="40" align="left" />

**About Cyprox — The Future of AI-Driven Cybersecurity** <br/></br>


**Cyprox** is pioneering the future of cybersecurity by combining artificial intelligence and security tools to empower organizations with next-level threat detection and automated response.  

> *"The Future of Cybersecurity Humans and AI, Working Together..."*

### Cyprox

- 🚀 **AI Driven Solutions:** Cybersecurity solutions using Agentic-AI systems with an AI-driven approach
- 🌐 **Community-Driven:** Open-source projects fostering collaboration and rapid evolution.
- ⚡ **Speed & Precision:** Automated threat detection that reduces human latency.
- 🔒 **Secure & Transparent:** Trustworthy platform built with open standards.

Explore more at [https://cyprox.io](https://cyprox.io)

---

## 🚀 Project Overview

**MCP for Security** repository contains 28 Model Context Protocol (MCP) server implementations for various security testing tools, making them accessible through a standardized interface. All servers share a common utility library (`mcp-shared/`) and support both stdio and HTTP transport.

---

## 🌐 Installation 

### Docker

You can use all MCP servers through Docker using the cyprox/mcp-for-security Docker image. It can also be used from any MCP client with Docker support, such as the Cyprox platform.
Visit [Cyprox](https://cyprox.io) for more information.

### Manuel
Since each MCP server may require different dependencies, the `start.sh` bash script provides a general setup mechanism. Nonetheless, users should always refer to the installation instructions specific to the corresponding MCP server to ensure proper setup.

---


## Available Tools

| Tool | Description | Detailed Documentation |
|------|-------------|------------------------|
| Amass | Advanced subdomain enumeration and reconnaissance tool | [Amass MCP Documentation](./amass-mcp) |
| Alterx | Pattern-based wordlist generator for subdomain discovery | [Alterx MCP Documentation](./alterx-mcp/) |
| Arjun | Run Arjun to discover hidden HTTP parameters | [Arjun MCP Documentation](./arjun-mcp) |
| Assetfinder | Passive subdomain discovery tool based on Tomnomnom's Assetfinder | [Assetfinder MCP Documentation](./assetfinder-mcp) |
| Cero | Certificate-based subdomain enumeration tool leveraging TLS handshakes to extract domain names from certificate fields like SAN | [Cero MCP Documentation](./cero-mcp) |
| Certificate Search (crt.sh) | Subdomain discovery tool using SSL certificate logs | [Certificate Search MCP Documentation](./crtsh-mcp/) |
| Commix | Command injection detection and exploitation tool | [Commix MCP Documentation](./commix-mcp/) |
| FFUF | Web content fuzzing tool for discovering hidden files and directories | [FFUF MCP Documentation](./ffuf-mcp/) |
| GitHub Subdomains | Subdomain discovery tool that searches GitHub code using the GitHub API | [GitHub Subdomains MCP Documentation](./github-subdomains-mcp/) |
| Gobuster | URI, DNS, S3, GCS, and vhost brute-forcing tool | [Gobuster MCP Documentation](./gobuster-mcp/) |
| Gowitness | Web screenshot and reconnaissance tool for capturing and analyzing web pages | [Gowitness MCP Documentation](./gowitness-mcp/) |
| HTTP Headers Security | Analyzer for HTTP security headers against OWASP standards | [HTTP Headers MCP Documentation](./http-headers-security-mcp/) |
| httpx | Fast and multi-purpose HTTP toolkit for port scanning | [httpx MCP Documentation](./httpx-mcp) |
| Katana | Fast and flexible web crawler with JS parsing and hybrid crawling support | [Katana MCP Documentation](./katana-mcp/) |
| Masscan | Fast port scanner for large-scale network discovery | [Masscan MCP Documentation](./masscan-mcp/) |
| MobSF | Mobile security framework for analyzing mobile applications | [MobSF MCP Documentation](./mobsf-mcp/) |
| Nmap | Comprehensive network scanning tool for service and vulnerability discovery | [Nmap MCP Documentation](./nmap-mcp/) |
| Nuclei | Vulnerability scanner using custom templates | [Nuclei MCP Documentation](./nuclei-mcp/) |
| Scout Suite | Cloud security auditing tool for assessing configurations across multiple services | [Scout Suite MCP Documentation](./scoutsuite-mcp/) |
| SecLists | Security tester's wordlist collection — browse, search, and retrieve wordlists for use with other tools | [SecLists MCP Documentation](./seclists-mcp/) |
| shuffledns | High-speed and customizable DNS brute-forcing and resolution tool | [shuffledns MCP Documentation](./shuffledns-mcp) |
| Smuggler | Advanced tool for detecting HTTP Request Smuggling vulnerabilities | [Smuggler MCP Documentation](./smuggler-mcp) |
| SQLmap | Advanced SQL injection detection and exploitation tool | [SQLmap MCP Documentation](./sqlmap-mcp/) |
| SSLScan | SSL/TLS configuration analyzer for security assessment | [SSLScan MCP Documentation](./sslscan-mcp/) |
| Subfinder | Fast passive subdomain enumeration tool for discovering valid subdomains | [Subfinder MCP Documentation](./subfinder-mcp/) |
| testssl.sh | Comprehensive TLS/SSL testing tool for protocols, ciphers, vulnerabilities, and certificates | [testssl MCP Documentation](./testssl-mcp/) |
| Waybackurls | Tool for retrieving historical URLs from the Wayback Machine | [Waybackurls MCP Documentation](./waybackurls-mcp/) |
| WPScan | WordPress vulnerability scanner for detecting plugins, themes, and configuration issues | [WPScan MCP Documentation](./wpscan-mcp/) |

## Quick Reference

### Alterx MCP  
Generates custom wordlists for subdomain discovery using pattern-based permutations.

### Amass MCP  
Advanced reconnaissance tool for subdomain enumeration and intelligence gathering with both passive and active modes.

### arjun MCP  
Discovers hidden HTTP parameters on web applications by scanning URLs, supporting custom wordlists, multiple methods, and adjustable scanning speeds.

### Assetfinder MCP
Discovers subdomains related to a given domain using passive enumeration techniques. Integrates Tomnomnom’s Assetfinder into the MCP ecosystem for fast and reliable reconnaissance.

### Cero MCP Server
Certificate-based subdomain discovery tool that extracts domain names from TLS certificates for reconnaissance and infrastructure mapping.

### Certificate Search (crt.sh) MCP
Discovers subdomains by querying SSL certificate transparency logs without active scanning.

### Commix MCP
Command injection detection and exploitation tool that tests URLs for OS command injection vulnerabilities.

### FFUF MCP Server
URL-based fuzzing tool with support for all FFUF command line arguments.

### GitHub Subdomains MCP
Discovers subdomains by searching GitHub code using the GitHub API. Requires a GitHub personal access token for authentication.

### Gobuster MCP Server
URI, DNS, S3, GCS, vhost, and TFTP brute-forcing tool with support for multiple scanning modes and customizable wordlists.

### Gowitness MCP Server
Web screenshot and reconnaissance tool that captures screenshots of web pages, analyzes HTTP responses, and provides visual reconnaissance capabilities for security assessments and web application testing.

### HTTP Headers Security MCP  
Analyzes HTTP response headers against OWASP security standards with recommendations.

### httpx MCP  
Performs high-speed probing of discovered subdomains to validate alive hosts, fetch response details, and enrich reconnaissance data without heavy scanning.

### Katana MCP 
Performs fast and customizable web crawling to discover endpoints, scripts, and hidden paths. Supports JavaScript parsing, depth control, and hybrid crawling with headless browsers to enrich reconnaissance and automation workflows.

### Masscan MCP Server  
Fast port scanning tool for target-based port discovery across networks.

### MobSF MCP Server  
Mobile application security testing framework for Android, iOS, and Windows applications.

### Nmap MCP Server  
Full-featured network scanner with detailed service fingerprinting and vulnerability detection.

### Nuclei MCP Server  
Template-based vulnerability scanner with an extensive library of security checks.

### Scout Suite MCP Server 
Performs a multi-service cloud security audit by analyzing cloud configurations and highlighting potential misconfigurations and risks based on best practices.

### shuffledns MCP
High-speed DNS brute-forcing and mass subdomain resolution tool to quickly discover valid subdomains using custom resolvers and wordlists.

### Subfinder MCP
Fast passive subdomain enumeration tool that discovers valid subdomains for websites using online passive sources without active probing.

### smuggler MCP  
HTTP Request Smuggling detection tool that identifies desynchronization vulnerabilities between front-end and back-end servers.

### SQLmap MCP Server  
SQL injection testing tool with comprehensive capabilities for vulnerability discovery.

### SSLScan MCP Server
SSL/TLS configuration analyzer for identifying weak ciphers and security misconfigurations.

### testssl MCP Server
Comprehensive TLS/SSL testing tool that checks protocols (SSLv2–TLS 1.3), cipher suites, vulnerabilities (Heartbleed, POODLE, DROWN, FREAK, and more), server defaults, certificates, and HTTP security headers. Supports targeted scans, batch scanning, and multiple output formats.

### SecLists MCP
Provides access to the SecLists wordlist collection — browse categories, search for wordlists by name, retrieve file paths for use with tools like ffuf and gobuster, and read wordlist contents directly.

### Waybackurls MCP
Retrieves historical URLs from the Wayback Machine to discover forgotten endpoints.

### WPScan MCP  
WordPress vulnerability scanner for detecting outdated plugins, themes, and common misconfigurations.


## Shared Library (`mcp-shared/`)

All servers depend on a shared utility library that provides:

- **`secureSpawn()`** — Secure child process spawning with stdin detached (`stdio: ['ignore', 'pipe', 'pipe']`), 50MB output buffer limit, and 5-minute timeout
- **`getToolArgs(usage, minArgs?)`** — Standardized CLI argument parsing that filters out framework flags (`--transport`, `--port`) and validates minimum positional args
- **`formatToolResult(result, options)`** — Consistent MCP response formatting: throws on nonzero exit, composes stdout/stderr, strips ANSI codes (optional), handles empty output
- **`sanitizePath()`** — Path traversal prevention for user-supplied file paths
- **`removeAnsiCodes()`** — ANSI escape code stripping for clean output
- **`truncateOutput()`** — Output length limiting with truncation notice
- **`startServer()`** — Dual transport bootstrap (stdio default, HTTP via `--transport http --port N`)
- **`getEnvOrArg()`** — Credential helper that prefers environment variables over CLI arguments

### Standard Server Pattern

Every spawn-based server follows this pattern:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult } from "mcp-shared";

const args = getToolArgs("my-tool-mcp <binary path>");

const server = new McpServer({ name: "my-tool", version: "1.0.0" });

server.tool(
    "do-my-tool",                    // Convention: do-<toolname>
    "Tool description",
    { target: z.string().describe("Target") },
    async ({ target }) => {
        const result = await secureSpawn(args[0], [target]);
        return formatToolResult(result, { toolName: "my-tool" });
    },
);

async function main() { await startServer(server); }
main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
```

### Build Script Pattern

Each server has a thin `build.sh` that sources `scripts/build-common.sh`:

```bash
#!/bin/bash
set -e
go install github.com/example/tool@latest    # Tool-specific install
BIN_ARGS=("$(which tool)")                    # Args passed after index.js
SERVICE_PATH=$(pwd)
source "$SERVICE_PATH/../scripts/build-common.sh"  # Shared npm build + config
```

### HTTP Transport

All servers support HTTP transport in addition to the default stdio:

```bash
# Stdio (default)
node nmap-mcp/build/index.js nmap

# HTTP transport on port 3001
node nmap-mcp/build/index.js nmap --transport http --port 3001
```

## TO-DO Tools
- Corsy
- CrackMapExec
- crlfuzz
- dalfox
- dnsrecon
- feroxbuster
- gau
- getJS
- github-endpoints
- gospider
- hakrawler
- kiterunner
- medusa
- naabu
- ParamSpider
- puredns
- s3scanner
- tlsx
- wafw00f
- webscreenshot
- ...

## Development

The project uses TypeScript and the Model Context Protocol SDK (`@modelcontextprotocol/sdk` ^1.17.2). All servers share a common utility library (`mcp-shared/`).

### Prerequisites

Build the shared library first:
```bash
cd mcp-shared && npm install && npm run build
```

### Testing

The project includes a comprehensive test suite (~300 tests) that runs **without any security tools installed**. Server tests use `InMemoryTransport` with mock spawn to validate tool registration, Zod schemas, argument construction, and response formatting through the real MCP protocol.

```bash
# Run all tests (mcp-shared + all 28 servers + integration)
npm test

# Run tests for a single server
cd nmap-mcp && npm run build && npm test

# Run only mcp-shared unit tests
cd mcp-shared && npm run build && npm test
```

Test utilities are provided by the `test-helpers/` package. See `CLAUDE.md` for details on writing new server tests.

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes (see `CLAUDE.md` for architecture details and conventions)
4. Ensure your server builds and tests pass: `npm install && npm run build && npm test`
5. Submit a pull request

## Installation

For installation instructions for each tool, please refer to the individual documentation linked in the table above.

## Usage

Each tool has specific parameters and usage instructions. For detailed information, see the documentation for the specific tool you want to use.

