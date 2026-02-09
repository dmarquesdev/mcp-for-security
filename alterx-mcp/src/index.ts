import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer } from "mcp-shared";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: alterx-mcp <alterx binary>");
    process.exit(1);
}

// Create server instance
const server = new McpServer({
    name: "alterx",
    version: "1.0.0",
});

server.tool(
    "do-alterx",
    "Execute Alterx, a tool that generates domain wordlists using pattern-based permutations for subdomain discovery and DNS enumeration",
    {
        domain: z.string().describe("Target domain or subdomains to use as a base for creating permutations (accepts stdin input, comma-separated values, or file path)"),
        pattern: z.string().describe(`Pattern template for generating wordlist variations. Multiple patterns can be specified using comma-separation.

            Available pattern types:

            - Dash-based patterns (e.g., api-dev.example.com):
              "{{word}}-{{sub}}.{{suffix}}"  // Produces: dev-api.example.com
              "{{sub}}-{{word}}.{{suffix}}"  // Produces: api-dev.example.com

            - Dot-based patterns (e.g., dev.api.example.com):
              "{{word}}.{{sub}}.{{suffix}}"  // Produces: word.api.example.com
              "{{sub}}.{{word}}.{{suffix}}"  // Produces: api.word.example.com

            - Iteration-based patterns:
              "{{sub}}{{number}}.{{suffix}}"  // Produces: api1.example.com, api2.example.com

            - Replacement patterns:
              "{{word}}.{{suffix}}"  // Replaces current subdomain completely

            - No separator patterns:
              "{{sub}}{{word}}.{{suffix}}"  // Produces: apidev.example.com

            - Region prefix patterns:
              "{{region}}.{{sub}}.{{suffix}}"  // Produces: us-east.api.example.com

            - Combination patterns:
              "{{word}}{{number}}.{{suffix}}"  // Combines words and numbers
            `),
        outputFilePath: z.string().nullable().describe("Path where the generated wordlist should be saved (optional)")
    },
    async ({ domain, pattern, outputFilePath }) => {
        const alterxArgs: string[] = [];

        alterxArgs.push("-l", domain);
        alterxArgs.push('-p', pattern);

        if (outputFilePath != null) {
            alterxArgs.push("-o", outputFilePath);
        }

        const result = await secureSpawn(args[0], alterxArgs);

        if (result.exitCode !== 0) {
            return {
                content: [{
                    type: "text" as const,
                    text: `alterx exited with code ${result.exitCode}\n${result.stderr}`
                }]
            };
        }

        return {
            content: [{
                type: "text" as const,
                text: result.stdout + "\n alterx completed successfully"
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
