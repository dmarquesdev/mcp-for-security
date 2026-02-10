import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult } from "mcp-shared";

const args = getToolArgs("commix-mcp [python path] [commix.py path]", 2);

const server = new McpServer({
    name: "commix",
    version: "1.0.0",
});

server.tool(
    "do-commix",
    "Run Commix to test for command injection issues",
    {
        url: z.string().url().describe("Target URL to test")
    },
    async ({ url }) => {
        const allArgs = [args[1], "-u", url, url];
        const result = await secureSpawn(args[0], allArgs);
        return formatToolResult(result, { toolName: "commix", stripAnsi: true });
    },
);

async function main() {
    await startServer(server);
    console.error("commix MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
