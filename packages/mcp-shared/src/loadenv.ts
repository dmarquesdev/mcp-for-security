import { config } from "dotenv";

// Explicit path takes priority (for MCP client configs where CWD differs from repo root)
if (process.env.MCP_ENV_FILE) {
    config({ path: process.env.MCP_ENV_FILE });
}

// Default: load from process.cwd()/.env — does NOT override already-set vars
config();
