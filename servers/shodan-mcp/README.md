# Shodan MCP Server

MCP server for the [Shodan](https://www.shodan.io/) search engine API. Shodan is an internet-connected device search engine widely used for security reconnaissance, exposing information about open ports, services, vulnerabilities, and network infrastructure.

## Requirements

- **Shodan API Key** - Register at [account.shodan.io/register](https://account.shodan.io/register)
- Node.js 18+ (uses native `fetch`)

## Installation

```bash
# From repo root
npm install
npm run build:shared
npm -w shodan-mcp run build
```

## Configuration

Set your API key via environment variable (recommended) or CLI argument:

```bash
# Environment variable (recommended)
export SHODAN_API_KEY=your_api_key_here

# Or pass as CLI argument
node build/index.js your_api_key_here
```

### MCP Client Configuration

```json
{
  "mcpServers": {
    "shodan-mcp": {
      "command": "node",
      "args": ["/path/to/servers/shodan-mcp/build/index.js"],
      "env": {
        "SHODAN_API_KEY": "your_api_key_here"
      }
    }
  }
}
```

## Tools

### do-shodan-host-info
Look up all available information for an IP address including open ports, services, location, and organization.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ip | string | Yes | IP address to look up |
| history | boolean | No | Include historical banners |
| minify | boolean | No | Return only basic host info |

### do-shodan-search
Search Shodan using the same query syntax as the website. Consumes 1 query credit per call.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Shodan search query |
| facets | string | No | Comma-separated facets |
| page | number | No | Page number (default: 1) |
| minify | boolean | No | Return only basic host info |

### do-shodan-search-count
Get total result count without consuming query credits.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| query | string | Yes | Shodan search query |
| facets | string | No | Comma-separated facets |

### do-shodan-dns-resolve
Resolve hostnames to IP addresses.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hostnames | string[] | Yes | Hostnames to resolve |

### do-shodan-dns-reverse
Reverse DNS lookup for IP addresses.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| ips | string[] | Yes | IPs to reverse lookup |

### do-shodan-dns-domain
Get all DNS entries and subdomains for a domain.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| domain | string | Yes | Domain to query |
| history | boolean | No | Include historical DNS data |
| type | string | No | Filter by record type (A, AAAA, CNAME, MX, NS, SOA, TXT) |
| page | number | No | Page number |

### do-shodan-api-info
Get API plan information including credits remaining.

### do-shodan-ports
List all ports that Shodan actively crawls.

### do-shodan-protocols
List all protocols available for on-demand scans.

### do-shodan-search-filters
List all search filters for query construction.

## Search Query Examples

```
# Find Apache servers in the US
apache country:US

# Find open SSH servers
port:22

# Find devices by organization
org:"Google LLC"

# Find specific products
product:nginx version:1.19

# Find vulnerable devices
vuln:CVE-2021-44228

# Combine filters
port:443 ssl.cert.subject.cn:example.com
```

## Agent Usage Examples

Natural-language prompts you can give an AI agent with access to this MCP server:

### Reconnaissance

> "Look up the IP address 203.0.113.50 on Shodan and summarize what services are exposed."

> "Get full host info for 8.8.8.8 including historical banners and tell me how its services have changed over time."

> "Find all internet-facing Apache servers in Germany. First get a count, then search the first page of results and summarize the top organizations."

### DNS Intelligence

> "Resolve these hostnames and tell me what IPs they point to: api.example.com, mail.example.com, vpn.example.com"

> "Do a reverse DNS lookup on 1.1.1.1, 8.8.8.8, and 9.9.9.9 and tell me who operates each one."

> "Pull all DNS records for example.com from Shodan and list every subdomain with its record type and value."

### Search & Discovery

> "How many internet-facing devices are running MongoDB with no authentication? Use search count first, then pull the first page if under 10,000 results."

> "Search Shodan for devices with port 443 and ssl.cert.subject.cn:mycompany.com — I want to find all our TLS-exposed services."

> "What search filters are available in Shodan? List them so I can build a more targeted query."

### Account & Metadata

> "Check my Shodan API credits — how many query and scan credits do I have left?"

> "List all the ports Shodan crawls and all the protocols it supports for on-demand scans."

### Multi-Tool Workflows

> "I'm investigating 198.51.100.0/24 — resolve the hostnames for the first 5 IPs, then look up host info on any that have open ports. Summarize the attack surface."

> "Enumerate subdomains of target.com using Shodan DNS, then for each subdomain resolve its IP and pull host details. Build me a table of subdomain, IP, open ports, and services."

## Security Considerations

- Store your API key in environment variables, not in code or config files
- The `do-shodan-search` tool consumes 1 query credit per call; use `do-shodan-search-count` for estimates
- DNS operations and metadata endpoints (ports, protocols, filters, api-info) are free
- Be mindful of rate limits on your Shodan plan
