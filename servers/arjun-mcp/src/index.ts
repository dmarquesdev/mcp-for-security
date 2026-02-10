import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult } from "mcp-shared";

const args = getToolArgs("arjun-mcp <arjun binary or python3 arjun>");

const server = new McpServer({
    name: "arjun",
    version: "1.0.0",
});

server.tool(
    "do-arjun",
    "Run Arjun to discover hidden HTTP parameters",
    {
        url: z.string().url().describe("Target URL to scan for hidden parameters"),
        textFile: z.string().optional().describe("Path to file containing multiple URLs"),
        wordlist: z.string().optional().describe("Path to custom wordlist file"),
        method: z.enum(["GET", "POST", "JSON", "HEADERS"]).optional().describe("HTTP method to use (default: GET)"),
        rateLimit: z.number().optional().describe("Maximum requests per second (default: 9999)"),
        chunkSize: z.number().optional().describe("Chunk size - number of parameters to send at once"),
    },
    async ({ url, textFile, wordlist, method, rateLimit, chunkSize }) => {
        const arjunArgs: string[] = [];
        if (!url && !textFile) throw new Error("url or textFile parameter required");
        if (url) arjunArgs.push('-u', url);
        if (textFile) arjunArgs.push('-f', textFile);
        if (wordlist) arjunArgs.push('-w', wordlist);
        if (method) arjunArgs.push('-m', method);
        if (rateLimit) arjunArgs.push('--rate-limit', rateLimit.toString());
        if (chunkSize) arjunArgs.push('--chunk-size', chunkSize.toString());

        const result = await secureSpawn(args[0], arjunArgs);
        return formatToolResult(result, { toolName: "arjun", stripAnsi: true });
    },
);

async function main() {
    await startServer(server);
    console.error("arjun MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
