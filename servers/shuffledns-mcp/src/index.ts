import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions, registerSecListsTool } from "mcp-shared";

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
        wordlist: z.string().describe("Wordlist file path. SecLists available at /opt/seclists/ (e.g. /opt/seclists/Discovery/DNS/subdomains-top1million-5000.txt)"),
        rateLimit: z.number().optional().describe("Rate limit for requests"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ target, resolver, mode, wordlist, rateLimit, timeoutSeconds }, extra) => {
        const shufflednsArgs = ["-d", target, "-r", resolver, "-mode", mode, "-w", wordlist, "-m", args[1], "-silent"];
        if (rateLimit) shufflednsArgs.push("-t", rateLimit.toString());

        const result = await secureSpawn(args[0], shufflednsArgs, buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "shuffledns" });
    },
);

registerSecListsTool(server);

async function main() {
    await startServer(server);
    console.error("shuffledns MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
