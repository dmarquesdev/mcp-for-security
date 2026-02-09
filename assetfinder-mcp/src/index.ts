import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer } from "mcp-shared";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: assetfinder-mcp <assetfinder binary>");
    process.exit(1);
}

// Create server instance
const server = new McpServer({
    name: "assetfinder",
    version: "1.0.0",
});

server.tool(
    "do-assetfinder",
    "Find related domains and subdomains using assetfinder for a given target.",
    {
        target: z.string().describe("The root domain (e.g., example.com) to discover associated subdomains and related domains."),
    },
    async ({ target }) => {
        const assetfinderArgs = ["-subs-only", target];

        const result = await secureSpawn(args[0], assetfinderArgs);

        if (result.exitCode !== 0) {
            throw new Error(`assetfinder exited with code ${result.exitCode}:\n${result.stderr}`);
        }

        return {
            content: [{
                type: "text" as const,
                text: result.stdout
            }]
        };
    },
);

// Start the server
async function main() {
    await startServer(server);
    console.error("assetfinder MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
