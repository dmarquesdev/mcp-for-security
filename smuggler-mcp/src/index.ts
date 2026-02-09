import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, removeAnsiCodes } from "mcp-shared";

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
        smuggler_args: z.array(z.string()).optional().describe("Additional smuggler arguments (e.g. -m, -v, -l, -t, -x, -verify)")
    },
    async ({ url, smuggler_args = [] }) => {
        const allArgs = [args[1], "-u", url, ...smuggler_args];
        const result = await secureSpawn(args[0], allArgs);

        if (result.exitCode !== 0) {
            throw new Error(`smuggler exited with code ${result.exitCode}:\n${result.stderr}`);
        }

        const output = removeAnsiCodes(result.stdout + result.stderr);
        const vulnResults = parseResults(output);

        return {
            content: [{ type: "text" as const, text: output || "No output from smuggler." }],
            metadata: { findings: vulnResults }
        };
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
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
