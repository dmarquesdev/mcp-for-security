import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer } from "mcp-shared";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: nuclei-mcp <nuclei binary>");
    process.exit(1);
}

// Create server instance
const server = new McpServer({
    name: "nuclei",
    version: "1.0.0",
});

server.tool(
    "do-nuclei",
    "Execute Nuclei, an advanced vulnerability scanner that uses YAML-based templates to detect security vulnerabilities, misconfigurations, and exposures in web applications and infrastructure. Nuclei offers fast scanning with a vast template library covering various security checks.",
    {
        url: z.string().url().describe("Target URL to run nuclei"),
        tags: z.array(z.string()).optional().describe("Tags to run nuclei for multiple choise use ,")
    },
    async ({ url, tags }) => {
        const nucleiArgs = ["-u", url, "-silent"];

        if (tags && tags.length > 0) {
            nucleiArgs.push("-tags", tags.join(","));
        }

        const result = await secureSpawn(args[0], nucleiArgs);

        if (result.exitCode !== 0) {
            throw new Error(`nuclei exited with code ${result.exitCode}:\n${result.stderr}`);
        }

        return {
            content: [{
                type: "text" as const,
                text: result.stdout
            }]
        };
    },
);

server.tool(
    "get-nuclei-tags",
    "Get Nuclei Tags",
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

// Start the server
async function main() {
    await startServer(server);
    console.error("nuclei MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
