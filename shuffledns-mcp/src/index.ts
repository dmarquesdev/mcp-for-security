import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer } from "mcp-shared";

const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("Usage: shuffledns-mcp <shuffledns binary> <massdns binary>");
    process.exit(1);
}

// Create server instance
const server = new McpServer({
    name: "shuffledns",
    version: "1.0.0",
});

server.tool(
    "shuffledns",
    "DNS Brute force",
    {
        target: z.string().describe("A list of domain names (e.g., example.com) to scan for HTTP and HTTPS services."),
        resolver: z.string().describe("Resolver file path"),
        mode: z.enum(["bruteforce", "resolve", "filter"]).describe("Mode"),
        wordlist: z.string().describe("wordlist"),
        rateLimit: z.number().optional().describe("ratelimit")
    },
    async ({ target, resolver, mode, wordlist, rateLimit }) => {
        const shufflednsArgs = ["-d", target, "-r", resolver, "-mode", mode, "-w", wordlist, "-m", args[1], "-silent"];
        if (rateLimit) {
            shufflednsArgs.push("-t", rateLimit.toString());
        }

        const result = await secureSpawn(args[0], shufflednsArgs);

        if (result.exitCode !== 0) {
            throw new Error(`shuffledns exited with code ${result.exitCode}:\n${result.stderr}`);
        }

        return {
            content: [{
                type: "text" as const,
                text: result.stdout
            }]
        };
    },
);

// Start the server
async function main() {
    await startServer(server);
    console.error("shuffledns MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
