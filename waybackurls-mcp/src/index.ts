import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer } from "mcp-shared";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: waybackurls-mcp <waybackurls binary>");
    process.exit(1);
}

// Create server instance
const server = new McpServer({
    name: "waybackurls",
    version: "1.0.0",
});

server.tool(
    "do-waybackurls",
    "Execute Waybackurls, a tool that fetches known URLs from the Wayback Machine archive for a given domain. This helps in discovering historical endpoints, forgotten API paths, and potentially vulnerable URLs that might not be directly accessible or linked from the current version of the website.",
    {
        target: z.string().url().describe("Target domain to retrieve historical URLs from the Wayback Machine (e.g., example.com)"),
        noSub: z.boolean().nullable().describe("When set to true, only retrieves URLs from the exact domain specified, excluding all subdomains"),
    },
    async ({ target, noSub }) => {
        const waybackurlsArgs = [target, ...(noSub ? ['--no-subs'] : [])];

        const result = await secureSpawn(args[0], waybackurlsArgs);

        if (result.exitCode !== 0) {
            return {
                content: [{
                    type: "text" as const,
                    text: `waybackurls exited with code ${result.exitCode}\n${result.stderr}`
                }]
            };
        }

        return {
            content: [{
                type: "text" as const,
                text: result.stdout + "\n waybackurls completed successfully"
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
