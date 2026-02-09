import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult } from "mcp-shared";

const args = getToolArgs("httpx-mcp <httpx binary>");

const server = new McpServer({
    name: "httpx",
    version: "1.0.0",
});

server.tool(
    "do-httpx",
    "Scans the given target domains and detects active HTTP/HTTPS services on ports like 80 and 443.",
    {
        target: z.array(z.string()).describe("A list of domain names (e.g., example.com) to scan for HTTP and HTTPS services."),
        ports: z.array(z.number()).optional().describe("Ports to scan"),
        probes: z.array(z.string()).optional().describe(`Available probe options:
            status-code, content-length, content-type, location, favicon,
            hash, jarm, response-time, line-count, word-count, title,
            body-preview, web-server, tech-detect, method, websocket,
            ip, cname, extract-fqdn, asn, cdn, probe`)
    },
    async ({ target, ports, probes }) => {
        const httpxArgs = ["-u", target.join(","), "-silent"];
        if (ports && ports.length > 0) httpxArgs.push("-p", ports.join(","));
        if (probes && probes.length > 0) {
            for (const probe of probes) httpxArgs.push(`-${probe}`);
        }

        const result = await secureSpawn(args[0], httpxArgs);
        return formatToolResult(result, { toolName: "httpx" });
    },
);

async function main() {
    await startServer(server);
    console.error("httpx MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
