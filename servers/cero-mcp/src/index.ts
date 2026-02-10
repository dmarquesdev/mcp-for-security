import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("cero-mcp <cero binary>");

const server = new McpServer({
    name: "cero",
    version: "1.0.0",
});

server.tool(
    "do-cero",
    "Execute Cero, a high-performance certificate-based subdomain enumeration tool. It connects to specified targets over TLS, extracts domain names from certificates (e.g., SAN fields), and outputs discovered hostnames. Useful for reconnaissance and OSINT tasks.",
    {
        target: z.string().describe("The target host or IP address to scan. Can be a single hostname, IPv4/IPv6 address, or a CIDR range (e.g., 192.168.0.0/24)."),
        concurrency: z.number().optional().describe("Maximum number of concurrent TLS connections to use during scanning. Higher values increase speed but consume more system resources."),
        ports: z.array(z.string()).optional().describe("List of TLS ports to scan for certificate information. If omitted, the default port 443 is used. Accepts multiple ports (e.g., ['443', '8443'])."),
        timeOut: z.number().optional().describe("Maximum time (in seconds) to wait for a TLS handshake with a target. Used to prevent long delays on unresponsive hosts. Default is 4 seconds."),
        ...TIMEOUT_SCHEMA,
    },
    async ({ target, concurrency, ports, timeOut, timeoutSeconds }, extra) => {
        const ceroArgs = [target];
        if (concurrency) ceroArgs.push("-c", concurrency.toString());
        if (ports && ports.length > 0) ceroArgs.push("-p", ports.join(","));
        if (timeOut) ceroArgs.push("-t", timeOut.toString());

        const result = await secureSpawn(args[0], ceroArgs, buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "cero" });
    },
);

async function main() {
    await startServer(server);
    console.error("cero MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
