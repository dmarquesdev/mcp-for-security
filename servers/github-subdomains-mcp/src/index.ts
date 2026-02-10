import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult } from "mcp-shared";

const args = getToolArgs("github-subdomains-mcp <binary> [github-token]");

const githubToken = args[1];
if (!githubToken) {
    console.error("Warning: No GitHub token provided. The tool will rely on the GITHUB_TOKEN environment variable.");
}

const server = new McpServer({
    name: "github-subdomains",
    version: "1.0.0",
});

server.tool(
    "do-github-subdomains",
    "Discover subdomains by searching GitHub code using the GitHub API. Requires a GitHub token.",
    {
        domain: z.string().describe("Target domain to find subdomains for (e.g., example.com)"),
        extended: z.boolean().optional().describe("Extended search mode (-e) for broader results"),
        exit_on_rate_limit: z.boolean().optional().describe("Exit when all tokens are rate-limited (-k)"),
        raw: z.boolean().optional().describe("Display raw unfiltered results (-raw)"),
    },
    async ({ domain, extended, exit_on_rate_limit, raw }) => {
        const toolArgs = ["-d", domain];
        if (githubToken) toolArgs.push("-t", githubToken);
        if (extended) toolArgs.push("-e");
        if (exit_on_rate_limit) toolArgs.push("-k");
        if (raw) toolArgs.push("-raw");

        const result = await secureSpawn(args[0], toolArgs);
        return formatToolResult(result, { toolName: "github-subdomains", includeStderr: true });
    },
);

async function main() {
    await startServer(server);
    console.error("github-subdomains MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
