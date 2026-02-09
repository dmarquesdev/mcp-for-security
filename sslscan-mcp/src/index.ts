import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult } from "mcp-shared";

const args = getToolArgs("sslscan-mcp <sslscan binary>");

const server = new McpServer({
    name: "sslscan",
    version: "1.0.0",
});

server.tool(
    "do-sslscan",
    "Execute SSLScan to identify supported cipher suites, TLS versions, certificate info, and security issues in SSL/TLS configurations.",
    {
        target: z.string().url().describe("Target URL to scan (must begin with https://)"),
        sslscan_args: z.array(z.string()).describe("Additional sslscan arguments (e.g. --show-certificate, --no-colour, --ssl2, --tls13, --xml)")
    },
    async ({ target, sslscan_args }) => {
        const result = await secureSpawn(args[0], [...sslscan_args, target]);
        return formatToolResult(result, { toolName: "sslscan", includeStderr: true });
    },
);

async function main() {
    await startServer(server);
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
