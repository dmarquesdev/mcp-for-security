import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("nmap-mcp <nmap binary>");

const server = new McpServer({
    name: "nmap",
    version: "1.0.0",
});

server.tool(
    "do-nmap",
    "Run nmap with specified target",
    {
        target: z.string().describe("Target ip to detect open ports"),
        nmap_args: z.array(z.string()).describe("Additional nmap arguments (e.g. -sV, -sC, -p, -T4, -A, --top-ports, etc.)"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ target, nmap_args, timeoutSeconds }, extra) => {
        const result = await secureSpawn(args[0], [...nmap_args, target], buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "nmap", includeStderr: true });
    },
);

async function main() {
    await startServer(server);
    console.error("nmap MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
