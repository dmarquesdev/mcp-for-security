import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("masscan-mcp <masscan binary>");

const server = new McpServer({
    name: "masscan",
    version: "1.0.0",
});

server.tool(
    "do-masscan",
    "Run masscan, a fast port scanner. Primary inputs are IP addresses/ranges and port numbers.",
    {
        target: z.string().describe("Target IP address or range (e.g. 1.1.1.1 or 10.0.0.0/8)"),
        port: z.string().describe("Target port or range (e.g. 80 or 0-65535)"),
        masscan_args: z.array(z.string()).describe("Additional masscan arguments (e.g. --max-rate)"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ target, port, masscan_args, timeoutSeconds }, extra) => {
        const result = await secureSpawn(args[0], ["-p" + port, target, ...masscan_args], buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "masscan", includeStderr: true });
    },
);

async function main() {
    await startServer(server);
    console.error("masscan MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
