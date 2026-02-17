# uro MCP Server

MCP server wrapping [uro](https://github.com/s0md3v/uro) — a Python-based URL deduplication and filtering tool that removes incremental URLs, duplicate parameter variations, and useless file types without making HTTP requests.

## Setup

```bash
# Install uro
pipx install uro
# or
pip install uro

# Build the server
npm run build
```

## Usage

```bash
# stdio mode (default)
node build/index.js "$(which uro)"

# HTTP mode
node build/index.js "$(which uro)" --transport http --port 3000
```

## Tool: do-uro

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| urls | string[] | Yes | URLs to deduplicate and filter |
| whitelist | string[] | No | Extensions to keep (e.g., ["php", "asp"]) |
| blacklist | string[] | No | Extensions to ignore (e.g., ["jpg", "png"]) |
| filters | string[] | No | Semantic filters: hasparams, noparams, hasext, noext, vuln, keepcontent, keepslash, allexts |
| timeoutSeconds | number | No | Timeout in seconds (default: 300) |

## Example Prompts

- "Deduplicate these URLs from my crawl results and remove redundant parameter variations"
- "Filter this URL list to only keep URLs with parameters using uro"
- "Clean up these URLs — blacklist image and CSS extensions, keep only PHP and ASP files"
- "Use uro to remove incremental URLs and keep only unique endpoint patterns"
- "Filter these URLs with the vuln filter to find potentially vulnerable endpoints"
