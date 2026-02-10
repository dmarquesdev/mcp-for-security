import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult } from "mcp-shared";

const args = getToolArgs("nuclei-mcp <nuclei binary>");

const server = new McpServer({
    name: "nuclei",
    version: "1.0.0",
});

server.tool(
    "do-nuclei",
    "Execute Nuclei, a vulnerability scanner that uses YAML-based templates to detect security issues in web applications and infrastructure.",
    {
        url: z.string().url().describe("Target URL to run nuclei"),
        tags: z.array(z.string()).optional().describe("Tags to filter nuclei templates (comma-separated)")
    },
    async ({ url, tags }) => {
        const nucleiArgs = ["-u", url, "-silent"];
        if (tags && tags.length > 0) nucleiArgs.push("-tags", tags.join(","));

        const result = await secureSpawn(args[0], nucleiArgs);
        return formatToolResult(result, { toolName: "nuclei" });
    },
);

server.tool(
    "do-nuclei-tags",
    "Get available Nuclei template tags",
    {},
    async () => {
        const response = await fetch('https://raw.githubusercontent.com/projectdiscovery/nuclei-templates/refs/heads/main/TEMPLATES-STATS.json');
        const data = await response.json() as { tags: { name: string }[] };
        const tagNames = data.tags.map(tag => tag.name);

        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(tagNames)
            }]
        };
    }
);

async function main() {
    await startServer(server);
    console.error("nuclei MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
