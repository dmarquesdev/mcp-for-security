# Dalfox MCP Server

MCP server wrapping [dalfox](https://github.com/hahwul/dalfox), a fast XSS (Cross-Site Scripting) vulnerability scanner.

## Setup

```bash
go install github.com/hahwul/dalfox/v2@latest
```

## Usage

```bash
# stdio (default)
node build/index.js "$(which dalfox)"

# HTTP transport
node build/index.js "$(which dalfox)" --transport http --port 3000
```

## Tool: do-dalfox

Scans a target URL for XSS vulnerabilities using parameter analysis and payload testing.

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| url | string | Yes | Target URL to scan |
| headers | string[] | No | Custom HTTP headers |
| cookie | string | No | Cookie string |
| method | string | No | HTTP method (GET/POST) |
| data | string | No | POST data body |
| blind | string | No | Blind XSS callback URL |
| worker | number | No | Concurrent workers |
| delay | number | No | Delay between requests (ms) |
| param | string[] | No | Specific parameters to test |
| format | enum | No | Output format (plain/json/jsonl) |
| follow_redirects | boolean | No | Follow HTTP redirects |
| only_discovery | boolean | No | Parameter analysis only |
| deep_domxss | boolean | No | Enhanced DOM XSS testing |
| user_agent | string | No | Custom User-Agent |
| proxy | string | No | Proxy URL |

## Example Prompts

- "Scan http://example.com/search?q=test for XSS vulnerabilities"
- "Test this URL for reflected XSS with custom cookies: http://target.com/page?id=1"
- "Run a blind XSS scan against http://target.com/contact with my callback server at https://xss.example.com"
- "Do parameter discovery only on http://target.com/api?user=admin&role=viewer"
- "Scan http://target.com/app for DOM-based XSS vulnerabilities with deep analysis"
