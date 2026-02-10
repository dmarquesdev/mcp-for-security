import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("sqlmap-mcp <sqlmap binary>");

const server = new McpServer({
    name: "sqlmap",
    version: "1.0.0",
});

server.tool(
    "do-sqlmap",
    "Run sqlmap for automated database security testing",
    {
        url: z.string().url().describe("Target URL to test"),
        sqlmap_args: z.array(z.string()).describe("Additional sqlmap arguments (e.g. --batch, --dbs, --tables, --dump, -p, --level, --risk, --data, --cookie, --random-agent)"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ url, sqlmap_args, timeoutSeconds }, extra) => {
        const result = await secureSpawn(args[0], ['-u', url, ...sqlmap_args], buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "sqlmap", includeStderr: true });
    },
);

async function main() {
    await startServer(server);
    console.error("sqlmap MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
