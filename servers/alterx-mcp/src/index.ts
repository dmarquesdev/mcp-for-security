import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("alterx-mcp <alterx binary>");

const server = new McpServer({
    name: "alterx",
    version: "1.0.0",
});

server.tool(
    "do-alterx",
    "Execute Alterx, a tool that generates domain wordlists using pattern-based permutations for subdomain discovery and DNS enumeration",
    {
        domain: z.string().describe("Target domain or subdomains to use as a base for creating permutations"),
        pattern: z.string().describe("Pattern template for generating wordlist variations (e.g. '{{word}}-{{sub}}.{{suffix}}')"),
        outputFilePath: z.string().optional().describe("Path where the generated wordlist should be saved (optional)"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ domain, pattern, outputFilePath, timeoutSeconds }, extra) => {
        const alterxArgs = ["-l", domain, "-p", pattern];
        if (outputFilePath != null) alterxArgs.push("-o", outputFilePath);

        const result = await secureSpawn(args[0], alterxArgs, buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "alterx" });
    },
);

async function main() {
    await startServer(server);
    console.error("alterx MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
