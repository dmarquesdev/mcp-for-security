import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("urldedupe-mcp <urldedupe binary>");

const server = new McpServer({
    name: "urldedupe",
    version: "1.0.0",
});

server.tool(
    "do-urldedupe",
    "Deduplicates a list of URLs by removing redundant URL and query parameter combinations. Accepts URLs via stdin and outputs unique URLs.",
    {
        urls: z.array(z.string()).describe("List of URLs to deduplicate (passed via stdin)."),
        regex_parse: z.boolean().optional().describe("Use regex-based URL parsing instead of standard (-r)."),
        similar: z.boolean().optional().describe("Filter out similar URLs with matching query parameter keys (-s)."),
        query_strings_only: z.boolean().optional().describe("Only consider URLs with query strings (-qs)."),
        no_extensions: z.boolean().optional().describe("Filter out URLs with common media/resource extensions (-ne)."),
        ...TIMEOUT_SCHEMA,
    },
    async ({ urls, regex_parse, similar, query_strings_only, no_extensions, timeoutSeconds }, extra) => {
        const urldedupeArgs: string[] = [];

        if (regex_parse) urldedupeArgs.push("-r");
        if (similar) urldedupeArgs.push("-s");
        if (query_strings_only) urldedupeArgs.push("-qs");
        if (no_extensions) urldedupeArgs.push("-ne");

        const stdinData = urls.join("\n") + "\n";
        const result = await secureSpawn(args[0], urldedupeArgs, buildSpawnOptions(extra, { timeoutSeconds, stdinData }));
        return formatToolResult(result, { toolName: "urldedupe" });
    },
);

async function main() {
    await startServer(server);
    console.error("urldedupe MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
