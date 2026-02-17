import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GetCrtSh } from './crtsh.js';
import { startServer, TIMEOUT_SCHEMA } from "mcp-shared";

// Create server instance
const server = new McpServer({
    name: "crtsh",
    version: "1.0.0",
});

server.tool(
    "do-crtsh",
    "Discovers subdomains from SSL certificate logs",
    {
        target: z.string().min(1, "Target cannot be empty").describe("Target domain to analyze (e.g., example.com)."),
        ...TIMEOUT_SCHEMA,
    },
    async ({ target, timeoutSeconds }, extra) => {
        if (!target || !target.trim()) {
            throw new Error("Target domain is required and cannot be empty");
        }
        const domains = await GetCrtSh(target, {
            signal: extra.signal,
            ...(timeoutSeconds && { timeoutMs: timeoutSeconds * 1000 }),
        });
        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(domains, null, 2)
            }]
        };
    }
);

// Start the server
async function main() {
    await startServer(server);
    console.error("crtsh MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
