import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult } from "mcp-shared";

const args = getToolArgs("shuffledns-mcp <shuffledns binary> <massdns binary>", 2);

const server = new McpServer({
    name: "shuffledns",
    version: "1.0.0",
});

server.tool(
    "do-shuffledns",
    "DNS brute force and resolution using shuffledns",
    {
        target: z.string().describe("Target domain (e.g., example.com)"),
        resolver: z.string().describe("Resolver file path"),
        mode: z.enum(["bruteforce", "resolve", "filter"]).describe("Operation mode"),
        wordlist: z.string().describe("Wordlist file path"),
        rateLimit: z.number().optional().describe("Rate limit for requests")
    },
    async ({ target, resolver, mode, wordlist, rateLimit }) => {
        const shufflednsArgs = ["-d", target, "-r", resolver, "-mode", mode, "-w", wordlist, "-m", args[1], "-silent"];
        if (rateLimit) shufflednsArgs.push("-t", rateLimit.toString());

        const result = await secureSpawn(args[0], shufflednsArgs);
        return formatToolResult(result, { toolName: "shuffledns" });
    },
);

async function main() {
    await startServer(server);
    console.error("shuffledns MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
