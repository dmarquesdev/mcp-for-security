import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("hakrawler-mcp <hakrawler binary>");

const server = new McpServer({
    name: "hakrawler",
    version: "1.0.0",
});

server.tool(
    "do-hakrawler",
    "Crawls web pages to discover endpoints, links, and JavaScript references. Accepts one or more URLs and returns discovered paths.",
    {
        urls: z.array(z.string()).describe("List of target URLs to crawl (e.g., https://example.com). Passed via stdin."),
        depth: z.number().optional().describe("Crawl depth (default: 2)."),
        disable_redirects: z.boolean().optional().describe("Disable following HTTP redirects (-dr)."),
        headers: z.string().optional().describe("Custom headers separated by double semi-colons (e.g., \"Header1: Value1;;Header2: Value2\")."),
        inside_path: z.boolean().optional().describe("Only crawl inside the URL path (-i)."),
        insecure: z.boolean().optional().describe("Disable TLS verification (-insecure)."),
        json: z.boolean().optional().describe("Output as JSON (-json)."),
        proxy: z.string().optional().describe("Proxy URL (e.g., http://127.0.0.1:8080)."),
        show_source: z.boolean().optional().describe("Show the source of URL based on where it was found (-s)."),
        page_size_limit: z.number().optional().describe("Page size limit in KB (-size). Default: -1 (no limit)."),
        include_subs: z.boolean().optional().describe("Include subdomains for crawling (-subs)."),
        threads: z.number().optional().describe("Number of threads (default: 8)."),
        url_timeout: z.number().optional().describe("Max seconds to crawl each URL from stdin (-timeout). Default: -1 (no limit)."),
        unique: z.boolean().optional().describe("Show only unique URLs (-u)."),
        show_where: z.boolean().optional().describe("Show at which link the URL was found (-w)."),
        ...TIMEOUT_SCHEMA,
    },
    async ({ urls, depth, disable_redirects, headers, inside_path, insecure, json, proxy, show_source, page_size_limit, include_subs, threads, url_timeout, unique, show_where, timeoutSeconds }, extra) => {
        const hakrawlerArgs: string[] = [];

        if (depth !== undefined) hakrawlerArgs.push("-d", depth.toString());
        if (disable_redirects) hakrawlerArgs.push("-dr");
        if (headers) hakrawlerArgs.push("-h", headers);
        if (inside_path) hakrawlerArgs.push("-i");
        if (insecure) hakrawlerArgs.push("-insecure");
        if (json) hakrawlerArgs.push("-json");
        if (proxy) hakrawlerArgs.push("-proxy", proxy);
        if (show_source) hakrawlerArgs.push("-s");
        if (page_size_limit !== undefined) hakrawlerArgs.push("-size", page_size_limit.toString());
        if (include_subs) hakrawlerArgs.push("-subs");
        if (threads !== undefined) hakrawlerArgs.push("-t", threads.toString());
        if (url_timeout !== undefined) hakrawlerArgs.push("-timeout", url_timeout.toString());
        if (unique) hakrawlerArgs.push("-u");
        if (show_where) hakrawlerArgs.push("-w");

        const stdinData = urls.join("\n") + "\n";
        const result = await secureSpawn(args[0], hakrawlerArgs, buildSpawnOptions(extra, { timeoutSeconds, stdinData }));
        return formatToolResult(result, { toolName: "hakrawler" });
    },
);

async function main() {
    await startServer(server);
    console.error("hakrawler MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
