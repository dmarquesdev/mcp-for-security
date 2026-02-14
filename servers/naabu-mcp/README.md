# Naabu MCP Server

MCP server wrapping [Naabu](https://github.com/projectdiscovery/naabu), a fast port scanner by ProjectDiscovery written in Go. Supports SYN and CONNECT scan types, configurable rate limiting, service discovery, and CDN detection.

## Prerequisites

- **Go** (1.21+)
- **libpcap** — required for SYN scanning (`libpcap-dev` on Debian/Ubuntu, `libpcap` on macOS via Homebrew)
- **Root/sudo** — required for SYN scan mode (`scan_type: "s"`); CONNECT mode (`scan_type: "c"`) works unprivileged

## Setup

```bash
# Install naabu
go install github.com/projectdiscovery/naabu/v2/cmd/naabu@latest

# Build the MCP server
cd servers/naabu-mcp
npm install && npm run build

# Run (stdio)
node build/index.js "$(which naabu)"

# Run (HTTP)
node build/index.js "$(which naabu)" --transport http --port 3000
```

## Tool: `do-naabu`

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `host` | string | Yes | Target host (IP, CIDR, or hostname) |
| `ports` | string | No | Ports to scan (e.g., `"80,443"`, `"1-1000"`) |
| `top_ports` | number | No | Scan top N most common ports |
| `exclude_ports` | string | No | Ports to exclude from scan |
| `scan_type` | `"s"` \| `"c"` | No | SYN or CONNECT scan type |
| `rate` | number | No | Probes per second |
| `retries` | number | No | Number of retries per probe |
| `probe_timeout` | number | No | Timeout per probe in milliseconds |
| `warm_up_time` | number | No | Wait time between scan phases (seconds) |
| `json` | boolean | No | Output in JSON format |
| `silent` | boolean | No | Show only host:port output |
| `interface_name` | string | No | Network interface to use |
| `source_ip` | string | No | Source IP for scan packets |
| `exclude_cdn` | boolean | No | Skip full scan for CDN/WAF IPs |
| `display_cdn` | boolean | No | Show CDN provider in output |
| `service_discovery` | boolean | No | Discover services on open ports |
| `service_version` | boolean | No | Detect service versions |
| `ping` | boolean | No | Use ping probes for host discovery |
| `timeoutSeconds` | number | No | MCP execution timeout (default 300s) |

## Example Prompts

1. **Quick scan of top ports:**
   > "Scan 192.168.1.1 for the top 100 most common open ports"

2. **Specific port range with service detection:**
   > "Scan 10.0.0.0/24 on ports 80,443,8080-8090 with service version detection"

3. **Fast CONNECT scan (no root required):**
   > "Do a CONNECT scan of example.com on ports 1-1000 at rate 500"

4. **CDN-aware scanning with JSON output:**
   > "Scan the target with CDN detection enabled and exclude CDN IPs, output as JSON"

5. **Silent scan for automation:**
   > "Silently scan 10.0.0.1 for the top 1000 ports and return only host:port pairs"
