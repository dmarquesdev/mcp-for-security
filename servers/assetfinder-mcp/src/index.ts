import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("assetfinder-mcp <assetfinder binary>");

const server = new McpServer({
    name: "assetfinder",
    version: "1.0.0",
});

server.tool(
    "do-assetfinder",
    "Find related domains and subdomains using assetfinder for a given target.",
    {
        target: z.string().describe("The root domain (e.g., example.com) to discover associated subdomains and related domains."),
        ...TIMEOUT_SCHEMA,
    },
    async ({ target, timeoutSeconds }, extra) => {
        const result = await secureSpawn(args[0], ["-subs-only", target], buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "assetfinder" });
    },
);

async function main() {
    await startServer(server);
    console.error("assetfinder MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
