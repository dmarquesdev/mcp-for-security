import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("waybackurls-mcp <waybackurls binary>");

const server = new McpServer({
    name: "waybackurls",
    version: "1.0.0",
});

server.tool(
    "do-waybackurls",
    "Fetch known URLs from the Wayback Machine archive for a given domain, useful for discovering historical endpoints.",
    {
        target: z.string().url().describe("Target domain to retrieve historical URLs from"),
        noSub: z.boolean().nullable().describe("When true, only retrieves URLs from the exact domain, excluding subdomains"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ target, noSub, timeoutSeconds }, extra) => {
        const waybackurlsArgs = [target, ...(noSub ? ['--no-subs'] : [])];
        const result = await secureSpawn(args[0], waybackurlsArgs, buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "waybackurls" });
    },
);

async function main() {
    await startServer(server);
    console.error("waybackurls MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
