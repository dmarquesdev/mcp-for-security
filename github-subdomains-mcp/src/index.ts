import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { spawn } from 'child_process';

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: github-subdomains-mcp <binary> [github-token]");
    process.exit(1);
}

const githubToken = args[1];
if (!githubToken) {
    console.error("Warning: No GitHub token provided. The tool will rely on the GITHUB_TOKEN environment variable.");
}

// Create server instance
const server = new McpServer({
    name: "github-subdomains",
    version: "1.0.0",
});

server.tool(
    "github-subdomains",
    "Discover subdomains by searching GitHub code using the GitHub API. Requires a GitHub token.",
    {
        domain: z.string().describe("Target domain to find subdomains for (e.g., example.com)"),
        extended: z.boolean().optional().describe("Extended search mode (-e) for broader results"),
        exit_on_rate_limit: z.boolean().optional().describe("Exit when all tokens are rate-limited (-k)"),
        raw: z.boolean().optional().describe("Display raw unfiltered results (-raw)"),
    },
    async ({ domain, extended, exit_on_rate_limit, raw }) => {

        const toolArgs = ["-d", domain];
        if (githubToken) {
            toolArgs.push("-t", githubToken);
        }

        if (extended) {
            toolArgs.push("-e");
        }

        if (exit_on_rate_limit) {
            toolArgs.push("-k");
        }

        if (raw) {
            toolArgs.push("-raw");
        }

        const child = spawn(args[0], toolArgs);
        let output = '';

        // Handle stdout
        child.stdout.on('data', (data) => {
            output += data.toString();
        });

        // Handle stderr
        child.stderr.on('data', (data) => {
            output += data.toString();
        });

        // Handle process completion
        return new Promise((resolve, reject) => {
            child.on('close', (code) => {
                if (code === 0 || typeof code === "undefined") {
                    resolve({
                        content: [{
                            type: "text" as const,
                            text: output || "No subdomains found."
                        }]
                    });
                } else {
                    reject(new Error(`github-subdomains exited with code ${code}`));
                }
            });

            child.on('error', (error) => {
                reject(new Error(`Failed to start github-subdomains: ${error.message}`));
            });
        });
    },
);

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("github-subdomains MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
