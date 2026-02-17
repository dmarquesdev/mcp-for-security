import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions, registerSecListsTool } from "mcp-shared";

const args = getToolArgs("ffuf-mcp <ffuf binary>");

const server = new McpServer({
    name: "ffuf",
    version: "1.0.0",
});

server.tool(
    "do-ffuf",
    "Run ffuf web fuzzer with specified URL. SecLists wordlists available at /opt/seclists/ (e.g. -w /opt/seclists/Discovery/Web-Content/common.txt). Use do-list-wordlists to browse available wordlists.",
    {
        url: z.string().url().describe("Target URL to fuzz"),
        ffuf_args: z.array(z.string()).describe("Additional ffuf arguments (e.g. -w /opt/seclists/Discovery/Web-Content/common.txt, -mc, -fc, -H, -X, -d, -t, -r, -ac, -s, -json, -o)"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ url, ffuf_args, timeoutSeconds }, extra) => {
        const result = await secureSpawn(args[0], ['-u', url, ...ffuf_args], buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "ffuf", includeStderr: true });
    },
);

registerSecListsTool(server);

async function main() {
    await startServer(server);
    console.error("ffuf MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
