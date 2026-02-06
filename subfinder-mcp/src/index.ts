import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const pty = require('node-pty');
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: subfinder-mcp <subfinder binary>");
    process.exit(1);
}

// Create server instance
const server = new McpServer({
    name: "subfinder",
    version: "1.0.0",
});

server.tool(
    "subfinder",
    "Fast passive subdomain enumeration tool that discovers valid subdomains using online passive sources.",
    {
        domain: z.string().describe("Target domain to enumerate subdomains for (e.g., example.com)"),
        sources: z.array(z.string()).optional().describe("Specific sources to use (e.g., crtsh, shodan, virustotal)"),
        exclude_sources: z.array(z.string()).optional().describe("Sources to exclude from enumeration"),
        all: z.boolean().optional().describe("Use all sources (includes API-dependent sources)"),
        recursive: z.boolean().optional().describe("Use recursive enumeration on discovered subdomains"),
        json: z.boolean().optional().describe("Output in JSON Lines format"),
        active: z.boolean().optional().describe("Display only active subdomains (performs DNS resolution)"),
        collect_sources: z.boolean().optional().describe("Include source information in JSON output"),
        ip: z.boolean().optional().describe("Include IP addresses in output"),
        timeout: z.number().optional().describe("Timeout in seconds for enumeration"),
        rate_limit: z.number().optional().describe("Maximum number of HTTP requests per second"),
        resolvers: z.array(z.string()).optional().describe("Custom DNS resolvers to use (e.g., 8.8.8.8, 1.1.1.1)"),
        match: z.array(z.string()).optional().describe("Match subdomain patterns to include"),
        filter: z.array(z.string()).optional().describe("Filter out subdomain patterns to exclude"),
        verbose: z.boolean().optional().describe("Show verbose output with additional details"),
    },
    async ({ domain, sources, exclude_sources, all, recursive, json, active, collect_sources, ip, timeout, rate_limit, resolvers, match, filter, verbose }) => {

        const subfinderArgs = ["-d", domain, "-silent"];

        if (sources && sources.length > 0) {
            subfinderArgs.push("-s", sources.join(","));
        }

        if (exclude_sources && exclude_sources.length > 0) {
            subfinderArgs.push("-es", exclude_sources.join(","));
        }

        if (all) {
            subfinderArgs.push("-all");
        }

        if (recursive) {
            subfinderArgs.push("-recursive");
        }

        if (json) {
            subfinderArgs.push("-oJ");
        }

        if (active) {
            subfinderArgs.push("-nW");
        }

        if (collect_sources) {
            subfinderArgs.push("-cs");
        }

        if (ip) {
            subfinderArgs.push("-oI");
        }

        if (timeout) {
            subfinderArgs.push("-timeout", timeout.toString());
        }

        if (rate_limit) {
            subfinderArgs.push("-rl", rate_limit.toString());
        }

        if (resolvers && resolvers.length > 0) {
            subfinderArgs.push("-r", resolvers.join(","));
        }

        if (match && match.length > 0) {
            subfinderArgs.push("-m", match.join(","));
        }

        if (filter && filter.length > 0) {
            subfinderArgs.push("-f", filter.join(","));
        }

        if (verbose) {
            subfinderArgs.push("-v");
        }

        let output = '';

        const subfinder = pty.spawn(args[0], subfinderArgs, {
            name: 'xterm-color',
            cols: 80,
            rows: 30,
            cwd: process.cwd(),
            env: process.env
        });

        subfinder.on('data', function (data: string) {
            output += data.toString();
        });

        // Handle process completion
        return new Promise((resolve, reject) => {
            subfinder.on('close', function (code: number) {
                if (code === 0 || typeof code === "undefined") {
                    output = removeAnsiCodes(output)
                    const resolveData: any = {
                        content: [{
                            type: "text",
                            text: output
                        }]
                    };
                    resolve(resolveData);
                } else {
                    reject(new Error(`subfinder exited with code ${code}`));
                }
            });
            subfinder.on('error', function (error: Error) {
                if (typeof error.cause !== "undefined") {
                    reject(new Error(`Error to start subfinder: ${error.cause}`));
                }
            });
        });
    },
);

function removeAnsiCodes(input: string): string {
    return input.replace(/\x1B\[[0-9;]*m/g, '');
}

// Start the server
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("subfinder MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
