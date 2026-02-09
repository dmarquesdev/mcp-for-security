import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, removeAnsiCodes } from "mcp-shared";

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error("Usage: commix-mcp [python path] [commix.py path]");
    process.exit(1);
}

const server = new McpServer({
    name: "commix",
    version: "1.0.0",
});

server.tool(
    "do-commix",
    "Run Commix to detect and exploit command injection vulnerabilities",
    {
        url: z.string().url().describe("Target URL to test for command injection")
    },
    async ({ url }) => {
        const baseArgs = [args[1], "-u", url];
        const allArgs = [...baseArgs, url];

        const result = await secureSpawn(args[0], allArgs);

        if (result.exitCode !== 0) {
            return {
                content: [{
                    type: "text" as const,
                    text: removeAnsiCodes(`commix exited with code ${result.exitCode}\n${result.stderr}`)
                }]
            };
        }

        return {
            content: [{
                type: "text" as const,
                text: removeAnsiCodes(result.stdout)
            }]
        };
    },
);

// Start the server
async function main() {
    await startServer(server);
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
