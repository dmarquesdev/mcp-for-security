import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, removeAnsiCodes } from "mcp-shared";

const args = process.argv.slice(2);
if (args.length !== 2) {
    console.error("Usage: smuggler-mcp [python path] [smuggler.py path]");
    process.exit(1);
}

const server = new McpServer({
    name: "smuggler",
    version: "1.0.0",
});

server.tool(
    "do-smuggler",
    "Run Smuggler to detect HTTP Request Smuggling vulnerabilities",
    {
        url: z.string().url().describe("Target URL to detect HTTP Request Smuggling"),
        smuggler_args: z.array(z.string()).optional().describe(`Additional smuggler arguments
        -m, --method METHOD  Specify the HTTP method to use (default: POST)
        -v, --vhost VHOST    Specify a virtual host to use
        -l, --len            Enable Content-Length header in all requests
        -c, --configfile FILE
                             Specify a configuration file to load payloads from
        -x                   Exit on the first finding
        -t, --timeout TIMEOUT
                             Socket timeout value (default: 5)
        -verify VERIFY       Verify findings with more requests; never, quick or thorough (default: quick)`)
    },
    async ({ url, smuggler_args = [] }) => {
        const baseArgs = [args[1], "-u", url];
        const allArgs = [...baseArgs, ...smuggler_args];

        const result = await secureSpawn(args[0], allArgs);

        if (result.exitCode !== 0) {
            return {
                content: [{
                    type: "text" as const,
                    text: `Smuggler exited with code ${result.exitCode}\n${result.stderr}`
                }]
            };
        }

        const output = removeAnsiCodes(result.stdout + result.stderr);
        const vulnResults = parseResults(output);

        return {
            content: [{
                type: "text" as const,
                text: output
            }],
            metadata: {
                findings: vulnResults
            }
        };
    },
);

interface VulnEntry {
    mutation: string;
    severity: string;
}

function parseResults(output: string): any {
    const vulnerabilities: {
        cl_te: VulnEntry[];
        te_cl: VulnEntry[];
    } = {
        cl_te: [],
        te_cl: []
    };

    const clteRegex = /\[(\+|\!)\] Potential (CL\.TE) Vulnerability Found \((\w+)\)/gi;
    const teclRegex = /\[(\+|\!)\] Potential (TE\.CL) Vulnerability Found \((\w+)\)/gi;

    let match;
    while ((match = clteRegex.exec(output)) !== null) {
        vulnerabilities.cl_te.push({
            mutation: match[3],
            severity: match[1] === '+' ? 'high' : 'medium'
        });
    }

    while ((match = teclRegex.exec(output)) !== null) {
        vulnerabilities.te_cl.push({
            mutation: match[3],
            severity: match[1] === '+' ? 'high' : 'medium'
        });
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
