import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("smuggler-mcp [python path] [smuggler.py path]", 2);

const server = new McpServer({
    name: "smuggler",
    version: "1.0.0",
});

server.tool(
    "do-smuggler",
    "Run Smuggler to test for HTTP request smuggling issues",
    {
        url: z.string().url().describe("Target URL to test"),
        smuggler_args: z.array(z.string()).optional().describe("Additional smuggler arguments (e.g. -m, -v, -l, -t, -x, -verify)"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ url, smuggler_args = [], timeoutSeconds }, extra) => {
        const allArgs = [args[1], "-u", url, ...smuggler_args];
        const result = await secureSpawn(args[0], allArgs, buildSpawnOptions(extra, { timeoutSeconds }));
        const response = formatToolResult(result, { toolName: "smuggler", includeStderr: true, stripAnsi: true });

        const output = response.content[0].text;
        const vulnResults = parseResults(output);

        if (vulnResults.cl_te.length > 0 || vulnResults.te_cl.length > 0) {
            response.content[0].text += `\n\n--- Findings ---\nCL.TE: ${vulnResults.cl_te.length} potential issues\nTE.CL: ${vulnResults.te_cl.length} potential issues`;
        }

        return response;
    },
);

interface VulnEntry { mutation: string; severity: string; }

function parseResults(output: string) {
    const vulnerabilities: { cl_te: VulnEntry[]; te_cl: VulnEntry[] } = { cl_te: [], te_cl: [] };

    const clteRegex = /\[(\+|!)\] Potential (CL\.TE) .* \((\w+)\)/gi;
    const teclRegex = /\[(\+|!)\] Potential (TE\.CL) .* \((\w+)\)/gi;

    let match;
    while ((match = clteRegex.exec(output)) !== null) {
        vulnerabilities.cl_te.push({ mutation: match[3], severity: match[1] === '+' ? 'high' : 'medium' });
    }
    while ((match = teclRegex.exec(output)) !== null) {
        vulnerabilities.te_cl.push({ mutation: match[3], severity: match[1] === '+' ? 'high' : 'medium' });
    }

    return vulnerabilities;
}

async function main() {
    await startServer(server);
    console.error("smuggler MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
