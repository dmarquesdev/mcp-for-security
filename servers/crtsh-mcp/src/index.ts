import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GetCrtSh } from './crtsh.js';
import { startServer } from "mcp-shared";

// Create server instance
const server = new McpServer({
    name: "crtsh",
    version: "1.0.0",
});

server.tool(
    "do-crtsh",
    "Discovers subdomains from SSL certificate logs",
    {
        target: z.string().describe("Target domain to analyze (e.g., example.com)."),
    },
    async ({ target }) => {
        const domains = await GetCrtSh(target);
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
