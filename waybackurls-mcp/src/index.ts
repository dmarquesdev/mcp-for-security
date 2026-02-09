import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult } from "mcp-shared";

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
    },
    async ({ target, noSub }) => {
        const waybackurlsArgs = [target, ...(noSub ? ['--no-subs'] : [])];
        const result = await secureSpawn(args[0], waybackurlsArgs);
        return formatToolResult(result, { toolName: "waybackurls" });
    },
);

async function main() {
    await startServer(server);
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
