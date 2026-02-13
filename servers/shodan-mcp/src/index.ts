import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ShodanClient } from "./shodan.js";
import { getEnvOrArg, startServer, TIMEOUT_SCHEMA } from "mcp-shared";

// Get API key — prefer env var over CLI arg
const apiKey = getEnvOrArg("SHODAN_API_KEY", 2);

if (!apiKey) {
    console.error("Usage: shodan-mcp <api-key>");
    console.error("  Or set SHODAN_API_KEY environment variable");
    process.exit(1);
}

const client = new ShodanClient(apiKey);

const server = new McpServer({
    name: "shodan",
    version: "1.0.0",
});

function buildRequestOptions(extra: { signal: AbortSignal }, timeoutSeconds?: number) {
    return {
        signal: extra.signal,
        ...(timeoutSeconds && { timeoutMs: timeoutSeconds * 1000 }),
    };
}

server.tool(
    "do-shodan-host-info",
    "Look up all available information for an IP address including open ports, services, location, and organization. Returns banners, hostnames, and vulnerability data.",
    {
        ip: z.string().describe("IP address to look up (e.g., 8.8.8.8)"),
        history: z.boolean().optional().describe("Include historical banners"),
        minify: z.boolean().optional().describe("Return only basic host info (ports, IPs, hostnames)"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ ip, history, minify, timeoutSeconds }, extra) => {
        const result = await client.hostInfo(ip, { ...buildRequestOptions(extra, timeoutSeconds), history, minify });
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
    }
);

server.tool(
    "do-shodan-search",
    "Search Shodan using the same query syntax as the website. Find devices, services, and vulnerabilities across the internet. Consumes 1 query credit per call.",
    {
        query: z.string().describe("Shodan search query (e.g., 'apache country:US', 'port:22 org:Google')"),
        facets: z.string().optional().describe("Comma-separated list of facets (e.g., 'country,org')"),
        page: z.number().optional().describe("Page number for results (default: 1)"),
        minify: z.boolean().optional().describe("Return only basic host info"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ query, facets, page, minify, timeoutSeconds }, extra) => {
        const result = await client.search(query, { ...buildRequestOptions(extra, timeoutSeconds), facets, page, minify });
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
    }
);

server.tool(
    "do-shodan-search-count",
    "Get the total number of results for a Shodan search query without consuming query credits. Useful for estimating result size before searching.",
    {
        query: z.string().describe("Shodan search query"),
        facets: z.string().optional().describe("Comma-separated list of facets"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ query, facets, timeoutSeconds }, extra) => {
        const result = await client.searchCount(query, { ...buildRequestOptions(extra, timeoutSeconds), facets });
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
    }
);

server.tool(
    "do-shodan-dns-resolve",
    "Resolve one or more hostnames to their IP addresses using Shodan's DNS infrastructure.",
    {
        hostnames: z.array(z.string()).describe("List of hostnames to resolve (e.g., ['google.com', 'github.com'])"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ hostnames, timeoutSeconds }, extra) => {
        const result = await client.dnsResolve(hostnames, buildRequestOptions(extra, timeoutSeconds));
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
    }
);

server.tool(
    "do-shodan-dns-reverse",
    "Perform reverse DNS lookups on one or more IP addresses to find associated hostnames.",
    {
        ips: z.array(z.string()).describe("List of IP addresses for reverse DNS (e.g., ['8.8.8.8', '1.1.1.1'])"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ ips, timeoutSeconds }, extra) => {
        const result = await client.dnsReverse(ips, buildRequestOptions(extra, timeoutSeconds));
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
    }
);

server.tool(
    "do-shodan-dns-domain",
    "Get all DNS entries and subdomains for a given domain. Returns A, AAAA, CNAME, MX, NS, SOA, and TXT records.",
    {
        domain: z.string().describe("Domain to query (e.g., 'example.com')"),
        history: z.boolean().optional().describe("Include historical DNS data"),
        type: z.string().optional().describe("Filter by DNS record type (A, AAAA, CNAME, MX, NS, SOA, TXT)"),
        page: z.number().optional().describe("Page number for results"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ domain, history, type, page, timeoutSeconds }, extra) => {
        const result = await client.dnsDomain(domain, { ...buildRequestOptions(extra, timeoutSeconds), history, type, page });
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
    }
);

server.tool(
    "do-shodan-api-info",
    "Get your Shodan API plan information including query credits remaining, scan credits, and plan type.",
    {
        ...TIMEOUT_SCHEMA,
    },
    async ({ timeoutSeconds }, extra) => {
        const result = await client.apiInfo(buildRequestOptions(extra, timeoutSeconds));
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
    }
);

server.tool(
    "do-shodan-ports",
    "List all ports that Shodan actively crawls on the internet.",
    {
        ...TIMEOUT_SCHEMA,
    },
    async ({ timeoutSeconds }, extra) => {
        const result = await client.ports(buildRequestOptions(extra, timeoutSeconds));
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
    }
);

server.tool(
    "do-shodan-protocols",
    "List all protocols that Shodan can use when performing on-demand internet scans.",
    {
        ...TIMEOUT_SCHEMA,
    },
    async ({ timeoutSeconds }, extra) => {
        const result = await client.protocols(buildRequestOptions(extra, timeoutSeconds));
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
    }
);

server.tool(
    "do-shodan-search-filters",
    "List all search filters that can be used in Shodan search queries.",
    {
        ...TIMEOUT_SCHEMA,
    },
    async ({ timeoutSeconds }, extra) => {
        const result = await client.searchFilters(buildRequestOptions(extra, timeoutSeconds));
        return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
        };
    }
);

async function main() {
    await startServer(server);
    console.error("shodan MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
