import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("dalfox-mcp <dalfox binary>");

const server = new McpServer({
    name: "dalfox",
    version: "1.0.0",
});

server.tool(
    "do-dalfox",
    "Scans a target URL for XSS (Cross-Site Scripting) vulnerabilities using parameter analysis and payload testing.",
    {
        url: z.string().min(1, "URL cannot be empty").describe("Target URL to scan for XSS vulnerabilities"),
        headers: z.array(z.string()).optional().describe("Custom HTTP headers (e.g., 'Authorization: Bearer token')"),
        cookie: z.string().optional().describe("Cookie string to include in requests"),
        method: z.string().optional().describe("HTTP method to use (GET or POST)"),
        data: z.string().optional().describe("POST data body"),
        blind: z.string().optional().describe("Blind XSS callback URL"),
        worker: z.number().optional().describe("Number of concurrent workers"),
        delay: z.number().optional().describe("Delay between requests in milliseconds"),
        param: z.array(z.string()).optional().describe("Specific parameters to test"),
        format: z.enum(["plain", "json", "jsonl"]).optional().describe("Output format"),
        follow_redirects: z.boolean().optional().describe("Follow HTTP redirects"),
        only_discovery: z.boolean().optional().describe("Only perform parameter analysis without XSS testing"),
        deep_domxss: z.boolean().optional().describe("Enable enhanced DOM-based XSS testing"),
        user_agent: z.string().optional().describe("Custom User-Agent string"),
        proxy: z.string().optional().describe("Proxy URL for requests"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ url, headers, cookie, method, data, blind, worker, delay, param, format, follow_redirects, only_discovery, deep_domxss, user_agent, proxy, timeoutSeconds }, extra) => {
        if (!url || !url.trim()) {
            throw new Error("URL parameter is required and cannot be empty");
        }
        const dalfoxArgs = ["url", url];

        if (headers) {
            for (const h of headers) dalfoxArgs.push("-H", h);
        }
        if (cookie) dalfoxArgs.push("-C", cookie);
        if (method) dalfoxArgs.push("-X", method);
        if (data) dalfoxArgs.push("-d", data);
        if (blind) dalfoxArgs.push("-b", blind);
        if (worker !== undefined) dalfoxArgs.push("-w", String(worker));
        if (delay !== undefined) dalfoxArgs.push("--delay", String(delay));
        if (param) {
            for (const p of param) dalfoxArgs.push("-p", p);
        }
        if (format) dalfoxArgs.push("--format", format);
        if (follow_redirects) dalfoxArgs.push("-F");
        if (only_discovery) dalfoxArgs.push("--only-discovery");
        if (deep_domxss) dalfoxArgs.push("--deep-domxss");
        if (user_agent) dalfoxArgs.push("--user-agent", user_agent);
        if (proxy) dalfoxArgs.push("--proxy", proxy);

        const result = await secureSpawn(args[0], dalfoxArgs, buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "dalfox" });
    },
);

async function main() {
    await startServer(server);
    console.error("dalfox MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
