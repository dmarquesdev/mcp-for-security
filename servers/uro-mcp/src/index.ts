import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("uro-mcp <uro binary>");

const server = new McpServer({
    name: "uro",
    version: "1.0.0",
});

server.tool(
    "do-uro",
    "Deduplicate and filter URLs using smart pattern removal. Removes incremental URLs, duplicate parameter variations, and useless file types. Supports extension whitelisting/blacklisting and semantic filters (hasparams, noparams, hasext, noext, vuln, keepcontent, keepslash, allexts).",
    {
        urls: z.array(z.string()).describe("List of URLs to deduplicate and filter (passed via stdin)."),
        whitelist: z.array(z.string()).optional().describe("Extensions to keep, removing all others (-w ext1 ext2)."),
        blacklist: z.array(z.string()).optional().describe("Extensions to ignore/remove (-b ext1 ext2)."),
        filters: z.array(z.string()).optional().describe("Semantic filter types to apply (-f filter1,filter2). Options: hasparams, noparams, hasext, noext, vuln, keepcontent, keepslash, allexts."),
        ...TIMEOUT_SCHEMA,
    },
    async ({ urls, whitelist, blacklist, filters, timeoutSeconds }, extra) => {
        const uroArgs: string[] = [];

        if (whitelist && whitelist.length > 0) {
            uroArgs.push("-w", ...whitelist);
        }
        if (blacklist && blacklist.length > 0) {
            uroArgs.push("-b", ...blacklist);
        }
        if (filters && filters.length > 0) {
            uroArgs.push("-f", filters.join(","));
        }

        const stdinData = urls.join("\n") + "\n";
        const result = await secureSpawn(args[0], uroArgs, buildSpawnOptions(extra, { timeoutSeconds, stdinData }));
        return formatToolResult(result, { toolName: "uro", stripAnsi: true });
    },
);

async function main() {
    await startServer(server);
    console.error("uro MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
