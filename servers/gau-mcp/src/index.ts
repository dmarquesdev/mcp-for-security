import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("gau-mcp <gau binary>");

const server = new McpServer({
    name: "gau",
    version: "1.0.0",
});

server.tool(
    "do-gau",
    "Fetches known URLs for domains from AlienVault OTX, Wayback Machine, Common Crawl, and URLScan. Returns discovered URLs for the given targets.",
    {
        targets: z.array(z.string()).describe("List of target domains to fetch URLs for (e.g., example.com)."),
        providers: z.array(z.string()).optional().describe("URL sources to use (e.g., [\"wayback\", \"otx\", \"commoncrawl\", \"urlscan\"])."),
        blacklist: z.array(z.string()).optional().describe("Extensions to skip (e.g., [\"jpg\", \"png\", \"gif\"])."),
        include_subs: z.boolean().optional().describe("Include subdomains of the target domain (--subs)."),
        json: z.boolean().optional().describe("Output as JSON (--json)."),
        match_status_codes: z.string().optional().describe("Only include URLs with these status codes (--mc). Comma-separated."),
        filter_status_codes: z.string().optional().describe("Exclude URLs with these status codes (--fc). Comma-separated."),
        match_mime_types: z.string().optional().describe("Only include URLs with these MIME types (--mt). Comma-separated."),
        filter_mime_types: z.string().optional().describe("Exclude URLs with these MIME types (--ft). Comma-separated."),
        from: z.string().optional().describe("Start date for fetching URLs (--from). Format: YYYYMM."),
        to: z.string().optional().describe("End date for fetching URLs (--to). Format: YYYYMM."),
        remove_duplicates: z.boolean().optional().describe("Remove duplicate URLs from output (--fp)."),
        threads: z.number().optional().describe("Number of threads (--threads)."),
        proxy: z.string().optional().describe("HTTP proxy URL (--proxy)."),
        retries: z.number().optional().describe("Number of retries for HTTP requests (--retries)."),
        request_timeout: z.number().optional().describe("Timeout in seconds for each HTTP request to providers (--timeout). Distinct from MCP timeoutSeconds."),
        verbose: z.boolean().optional().describe("Show verbose output (--verbose)."),
        ...TIMEOUT_SCHEMA,
    },
    async ({ targets, providers, blacklist, include_subs, json, match_status_codes, filter_status_codes, match_mime_types, filter_mime_types, from, to, remove_duplicates, threads, proxy, retries, request_timeout, verbose, timeoutSeconds }, extra) => {
        const gauArgs: string[] = [];

        if (providers && providers.length > 0) gauArgs.push("--providers", providers.join(","));
        if (blacklist && blacklist.length > 0) gauArgs.push("--blacklist", blacklist.join(","));
        if (include_subs) gauArgs.push("--subs");
        if (json) gauArgs.push("--json");
        if (match_status_codes) gauArgs.push("--mc", match_status_codes);
        if (filter_status_codes) gauArgs.push("--fc", filter_status_codes);
        if (match_mime_types) gauArgs.push("--mt", match_mime_types);
        if (filter_mime_types) gauArgs.push("--ft", filter_mime_types);
        if (from) gauArgs.push("--from", from);
        if (to) gauArgs.push("--to", to);
        if (remove_duplicates) gauArgs.push("--fp");
        if (threads !== undefined) gauArgs.push("--threads", threads.toString());
        if (proxy) gauArgs.push("--proxy", proxy);
        if (retries !== undefined) gauArgs.push("--retries", retries.toString());
        if (request_timeout !== undefined) gauArgs.push("--timeout", request_timeout.toString());
        if (verbose) gauArgs.push("--verbose");

        // Targets are positional args — appended after all flags
        gauArgs.push(...targets);

        const result = await secureSpawn(args[0], gauArgs, buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "gau" });
    },
);

async function main() {
    await startServer(server);
    console.error("gau MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
