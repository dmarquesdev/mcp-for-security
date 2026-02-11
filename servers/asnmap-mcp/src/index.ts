import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("asnmap-mcp <asnmap binary>");

const server = new McpServer({
    name: "asnmap",
    version: "1.0.0",
});

server.tool(
    "do-asnmap",
    "Map ASN (Autonomous System Number) data to CIDR ranges. Accepts ASN, IP, domain, or organization lookups and returns network ranges.",
    {
        asn: z.string().optional().describe("ASN to lookup (e.g., AS14421)"),
        ip: z.string().optional().describe("IP address to lookup"),
        domain: z.string().optional().describe("Domain name to lookup"),
        org: z.string().optional().describe("Organization name to lookup"),
        json: z.boolean().optional().describe("Output in JSON format"),
        csv: z.boolean().optional().describe("Output in CSV format"),
        ipv6: z.boolean().optional().describe("Include IPv6 CIDR ranges"),
        resolvers: z.string().optional().describe("Custom resolver list (comma-separated)"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ asn, ip, domain, org, json, csv, ipv6, resolvers, timeoutSeconds }, extra) => {
        if (!asn && !ip && !domain && !org) {
            return {
                content: [{ type: "text" as const, text: "Error: at least one of asn, ip, domain, or org must be provided" }],
                isError: true,
            };
        }

        const asnmapArgs: string[] = [];

        if (asn) asnmapArgs.push("-a", asn);
        if (ip) asnmapArgs.push("-i", ip);
        if (domain) asnmapArgs.push("-d", domain);
        if (org) asnmapArgs.push("-org", org);
        if (json) asnmapArgs.push("-json");
        if (csv) asnmapArgs.push("-csv");
        if (ipv6) asnmapArgs.push("-v6");
        if (resolvers) asnmapArgs.push("-r", resolvers);

        asnmapArgs.push("-silent", "-disable-update-check");

        const result = await secureSpawn(args[0], asnmapArgs, buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "asnmap" });
    },
);

async function main() {
    await startServer(server);
    console.error("asnmap MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
