import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

const args = getToolArgs("naabu-mcp <naabu binary>");

const server = new McpServer({
    name: "naabu",
    version: "1.0.0",
});

server.tool(
    "do-naabu",
    "Fast port scanner for network reconnaissance. Scans target hosts to discover open ports using SYN/CONNECT probes with configurable rate, timeout, and service detection.",
    {
        host: z.string().describe("Target host to scan (IP address, CIDR range, or hostname)."),
        ports: z.string().optional().describe("Ports to scan (e.g., '80,443', '1-1000'). Maps to -p flag."),
        top_ports: z.number().optional().describe("Scan top N most common ports (e.g., 100, 1000). Maps to -top-ports."),
        exclude_ports: z.string().optional().describe("Ports to exclude from scan (e.g., '22,3389'). Maps to -exclude-ports."),
        scan_type: z.enum(["s", "c"]).optional().describe("Scan type: 's' for SYN (default, requires root), 'c' for CONNECT. Maps to -s flag."),
        rate: z.number().optional().describe("Rate of port scan probes per second (e.g., 1000). Maps to -rate."),
        retries: z.number().optional().describe("Number of retries for port scan probes (default 3). Maps to -retries."),
        probe_timeout: z.number().optional().describe("Timeout in milliseconds for each probe (default 1000). Maps to naabu -timeout flag."),
        warm_up_time: z.number().optional().describe("Time in seconds to wait between scan phases (default 2). Maps to -warm-up-time."),
        json: z.boolean().optional().describe("Output results in JSON format. Maps to -json."),
        silent: z.boolean().optional().describe("Show only host:port in output. Maps to -silent."),
        interface_name: z.string().optional().describe("Network interface to use for scan. Maps to -interface."),
        source_ip: z.string().optional().describe("Source IP address for scan packets. Maps to -source-ip."),
        exclude_cdn: z.boolean().optional().describe("Skip full port scan for CDN/WAF IPs. Maps to -exclude-cdn."),
        display_cdn: z.boolean().optional().describe("Display CDN provider name in output. Maps to -display-cdn."),
        service_discovery: z.boolean().optional().describe("Discover services on open ports. Maps to -sD."),
        service_version: z.boolean().optional().describe("Detect service versions on open ports. Maps to -sV."),
        ping: z.boolean().optional().describe("Use ping probes for host discovery. Maps to -ping."),
        ...TIMEOUT_SCHEMA,
    },
    async ({ host, ports, top_ports, exclude_ports, scan_type, rate, retries, probe_timeout, warm_up_time, json, silent, interface_name, source_ip, exclude_cdn, display_cdn, service_discovery, service_version, ping, timeoutSeconds }, extra) => {
        const naabuArgs: string[] = ["-host", host, "-no-stdin"];

        if (ports) naabuArgs.push("-p", ports);
        if (top_ports !== undefined) naabuArgs.push("-top-ports", top_ports.toString());
        if (exclude_ports) naabuArgs.push("-exclude-ports", exclude_ports);
        if (scan_type) naabuArgs.push("-s", scan_type);
        if (rate !== undefined) naabuArgs.push("-rate", rate.toString());
        if (retries !== undefined) naabuArgs.push("-retries", retries.toString());
        if (probe_timeout !== undefined) naabuArgs.push("-timeout", probe_timeout.toString());
        if (warm_up_time !== undefined) naabuArgs.push("-warm-up-time", warm_up_time.toString());
        if (json) naabuArgs.push("-json");
        if (silent) naabuArgs.push("-silent");
        if (interface_name) naabuArgs.push("-interface", interface_name);
        if (source_ip) naabuArgs.push("-source-ip", source_ip);
        if (exclude_cdn) naabuArgs.push("-exclude-cdn");
        if (display_cdn) naabuArgs.push("-display-cdn");
        if (service_discovery) naabuArgs.push("-sD");
        if (service_version) naabuArgs.push("-sV");
        if (ping) naabuArgs.push("-ping");

        const result = await secureSpawn(args[0], naabuArgs, buildSpawnOptions(extra, { timeoutSeconds }));
        return formatToolResult(result, { toolName: "naabu" });
    },
);

async function main() {
    await startServer(server);
    console.error("naabu MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
