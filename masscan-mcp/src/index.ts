import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer } from "mcp-shared";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: masscan <masscan binary>");
    process.exit(1);
}

// Create server instance
const server = new McpServer({
    name: "masscan",
    version: "1.0.0",
});

server.tool(
    "do-masscan",
    "Run masscan with specified target MASSCAN is a fast port scanner. The primary input parameters are the IP addresses/ranges you want to scan, and the port numbers.",
    {
        target: z.string().describe(`Target information. Example: 1.1.1.1
            1.1.1.1
            `),
        port: z.string().describe(`Target port. Example: 1234
               0-65535
                `),
        masscan_args: z.array(z.string()).describe(`Additional masscan arguments 
            --max-rate 
            `),
    },
    async ({ target, port, masscan_args }) => {
        const result = await secureSpawn(args[0], ["-p" + port, target, ...masscan_args]);

        if (result.exitCode !== 0) {
            throw new Error(`masscan exited with code ${result.exitCode}:\n${result.stderr}`);
        }

        return {
            content: [{
                type: "text" as const,
                text: (result.stdout + result.stderr) || "No output from masscan."
            }]
        };
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