# SecLists MCP Server

An MCP server that provides access to [SecLists](https://github.com/danielmiessler/SecLists) — the security tester's companion wordlist collection. Browse, search, and retrieve wordlists for use with other security tools.

## Features

- **Browse categories** — List all SecLists top-level categories (Discovery, Passwords, Fuzzing, Payloads, etc.)
- **List wordlists** — Explore files and subdirectories within any category
- **Search wordlists** — Find wordlists by filename pattern across the entire collection
- **Get file paths** — Retrieve absolute paths to pass to tools like ffuf, gobuster, nuclei, etc.
- **Read contents** — Preview or read full wordlist contents with line counts

## Installation

### Prerequisites
- Node.js (v18+)
- Git (for cloning SecLists)

### Setup

```bash
cd seclists-mcp
npm install
npm run build
```

SecLists will be cloned automatically by `build.sh` to `/opt/seclists`, or you can provide your own path:

```bash
./build.sh
```

## Usage

### MCP Client Configuration

```json
{
  "mcpServers": {
    "seclists-mcp": {
      "command": "node",
      "args": ["/path/to/seclists-mcp/build/index.js", "/opt/seclists"]
    }
  }
}
```

### Available Tools

#### `seclists-list-categories`
List all top-level SecLists categories.

**Parameters:** None

**Example output:**
```
SecLists categories (9):

Ai/LLM_Testing
Discovery
Fuzzing
Miscellaneous
Passwords
Pattern-Matching
Payloads
Usernames
Web-Shells
```

#### `seclists-list-wordlists`
List files and subdirectories within a SecLists path.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Relative path within SecLists, e.g. `Discovery/Web-Content` |

#### `seclists-search`
Search for wordlists by filename pattern across all categories.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| pattern | string | Yes | Search pattern, e.g. `common`, `sql`, `top-1000` |
| max_results | number | No | Max results (default: 50) |

#### `seclists-get-path`
Get the absolute filesystem path to a wordlist. Use this to pass paths to other tools.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Relative path, e.g. `Discovery/Web-Content/common.txt` |

#### `seclists-read-wordlist`
Read wordlist contents with optional line limit.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Relative path to wordlist file |
| max_lines | number | No | Max lines to return (default: 500, 0 = count only) |

## Integration with Other Tools

The `seclists-get-path` tool is designed to work with other MCP servers:

```
1. Use seclists-search to find: "common" → Discovery/Web-Content/common.txt
2. Use seclists-get-path to get: /opt/seclists/Discovery/Web-Content/common.txt
3. Pass the path to gobuster: do-gobuster-dir with wordlist=/opt/seclists/Discovery/Web-Content/common.txt
```

## Acknowledgments

- [SecLists](https://github.com/danielmiessler/SecLists) by Daniel Miessler, Jason Haddix, and community contributors
- [Model Context Protocol](https://modelcontextprotocol.io/)
