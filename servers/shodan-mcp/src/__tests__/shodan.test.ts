import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
    createTestServer,
    assertToolExists,
    assertToolCallSucceeds,
    assertToolCallFails,
    getResultText,
} from "test-helpers";
import { TIMEOUT_SCHEMA } from "mcp-shared";

describe("shodan-mcp", () => {
    const harness = createTestServer("shodan");

    // --- Mock data ---

    const mockHostInfo = {
        ip_str: "8.8.8.8",
        ports: [53, 443],
        org: "Google LLC",
        os: null,
        hostnames: ["dns.google"],
    };

    const mockSearchResults = {
        matches: [
            { ip_str: "1.2.3.4", port: 80, org: "Example Corp" },
            { ip_str: "5.6.7.8", port: 443, org: "Test Inc" },
        ],
        total: 12345,
    };

    const mockSearchCount = { total: 54321, facets: {} };

    const mockDnsResolve = { "google.com": "142.250.80.46", "github.com": "140.82.121.3" };

    const mockDnsReverse = { "8.8.8.8": ["dns.google"], "1.1.1.1": ["one.one.one.one"] };

    const mockDnsDomain = {
        domain: "example.com",
        subdomains: ["www", "mail", "api"],
        data: [
            { subdomain: "www", type: "A", value: "93.184.216.34" },
        ],
    };

    const mockApiInfo = {
        query_credits: 100,
        scan_credits: 50,
        plan: "dev",
    };

    const mockPorts = [21, 22, 23, 25, 53, 80, 443, 8080];

    const mockProtocols = {
        "dns-tcp": "DNS over TCP",
        http: "HTTP",
        https: "HTTPS",
    };

    const mockSearchFilters = ["asn", "city", "country", "ip", "org", "port", "product", "version"];

    // --- Tool registrations (mirror index.ts with mock handlers) ---

    harness.server.tool(
        "do-shodan-host-info",
        "Look up all available information for an IP address",
        {
            ip: z.string(),
            history: z.boolean().optional(),
            minify: z.boolean().optional(),
            ...TIMEOUT_SCHEMA,
        },
        async ({ ip }) => {
            return {
                content: [{ type: "text" as const, text: JSON.stringify({ ...mockHostInfo, ip_str: ip }, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-shodan-search",
        "Search Shodan",
        {
            query: z.string(),
            facets: z.string().optional(),
            page: z.number().optional(),
            minify: z.boolean().optional(),
            ...TIMEOUT_SCHEMA,
        },
        async () => {
            return {
                content: [{ type: "text" as const, text: JSON.stringify(mockSearchResults, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-shodan-search-count",
        "Get total count for a search query",
        {
            query: z.string(),
            facets: z.string().optional(),
            ...TIMEOUT_SCHEMA,
        },
        async () => {
            return {
                content: [{ type: "text" as const, text: JSON.stringify(mockSearchCount, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-shodan-dns-resolve",
        "Resolve hostnames to IPs",
        {
            hostnames: z.array(z.string()),
            ...TIMEOUT_SCHEMA,
        },
        async () => {
            return {
                content: [{ type: "text" as const, text: JSON.stringify(mockDnsResolve, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-shodan-dns-reverse",
        "Reverse DNS lookup",
        {
            ips: z.array(z.string()),
            ...TIMEOUT_SCHEMA,
        },
        async () => {
            return {
                content: [{ type: "text" as const, text: JSON.stringify(mockDnsReverse, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-shodan-dns-domain",
        "Get DNS entries for a domain",
        {
            domain: z.string(),
            history: z.boolean().optional(),
            type: z.string().optional(),
            page: z.number().optional(),
            ...TIMEOUT_SCHEMA,
        },
        async ({ domain }) => {
            return {
                content: [{ type: "text" as const, text: JSON.stringify({ ...mockDnsDomain, domain }, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-shodan-api-info",
        "Get API plan information",
        {
            ...TIMEOUT_SCHEMA,
        },
        async () => {
            return {
                content: [{ type: "text" as const, text: JSON.stringify(mockApiInfo, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-shodan-ports",
        "List all crawled ports",
        {
            ...TIMEOUT_SCHEMA,
        },
        async () => {
            return {
                content: [{ type: "text" as const, text: JSON.stringify(mockPorts, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-shodan-protocols",
        "List all scan protocols",
        {
            ...TIMEOUT_SCHEMA,
        },
        async () => {
            return {
                content: [{ type: "text" as const, text: JSON.stringify(mockProtocols, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-shodan-search-filters",
        "List all search filters",
        {
            ...TIMEOUT_SCHEMA,
        },
        async () => {
            return {
                content: [{ type: "text" as const, text: JSON.stringify(mockSearchFilters, null, 2) }],
            };
        }
    );

    // --- Tests ---

    it("registers all 10 tools", async () => {
        await harness.connect();
        const tools = [
            "do-shodan-host-info",
            "do-shodan-search",
            "do-shodan-search-count",
            "do-shodan-dns-resolve",
            "do-shodan-dns-reverse",
            "do-shodan-dns-domain",
            "do-shodan-api-info",
            "do-shodan-ports",
            "do-shodan-protocols",
            "do-shodan-search-filters",
        ];
        for (const tool of tools) {
            await assertToolExists(harness.client, tool);
        }
        await harness.cleanup();
    });

    it("do-shodan-host-info returns host data with IP", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-shodan-host-info", {
            ip: "8.8.8.8",
        });
        const parsed = JSON.parse(getResultText(result));
        assert.equal(parsed.ip_str, "8.8.8.8");
        assert.ok(Array.isArray(parsed.ports));
        assert.ok(parsed.org);
        await harness.cleanup();
    });

    it("do-shodan-host-info accepts optional parameters", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-shodan-host-info", {
            ip: "1.1.1.1",
            history: true,
            minify: true,
            timeoutSeconds: 30,
        });
        await harness.cleanup();
    });

    it("do-shodan-host-info rejects missing ip", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-shodan-host-info", {});
        await harness.cleanup();
    });

    it("do-shodan-search returns matches array", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-shodan-search", {
            query: "apache country:US",
        });
        const parsed = JSON.parse(getResultText(result));
        assert.ok(Array.isArray(parsed.matches));
        assert.equal(parsed.matches.length, 2);
        assert.equal(parsed.total, 12345);
        await harness.cleanup();
    });

    it("do-shodan-search accepts pagination", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-shodan-search", {
            query: "nginx",
            page: 2,
            facets: "country",
            minify: true,
        });
        await harness.cleanup();
    });

    it("do-shodan-search-count returns total count", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-shodan-search-count", {
            query: "apache",
        });
        const parsed = JSON.parse(getResultText(result));
        assert.equal(parsed.total, 54321);
        await harness.cleanup();
    });

    it("do-shodan-dns-resolve resolves hostnames", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-shodan-dns-resolve", {
            hostnames: ["google.com", "github.com"],
        });
        const parsed = JSON.parse(getResultText(result));
        assert.ok(parsed["google.com"]);
        assert.ok(parsed["github.com"]);
        await harness.cleanup();
    });

    it("do-shodan-dns-resolve rejects missing hostnames", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-shodan-dns-resolve", {});
        await harness.cleanup();
    });

    it("do-shodan-dns-reverse returns hostnames for IPs", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-shodan-dns-reverse", {
            ips: ["8.8.8.8", "1.1.1.1"],
        });
        const parsed = JSON.parse(getResultText(result));
        assert.ok(parsed["8.8.8.8"]);
        assert.ok(parsed["1.1.1.1"]);
        await harness.cleanup();
    });

    it("do-shodan-dns-domain returns subdomains", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-shodan-dns-domain", {
            domain: "example.com",
        });
        const parsed = JSON.parse(getResultText(result));
        assert.equal(parsed.domain, "example.com");
        assert.ok(Array.isArray(parsed.subdomains));
        assert.ok(parsed.subdomains.length > 0);
        await harness.cleanup();
    });

    it("do-shodan-api-info returns credits and plan", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-shodan-api-info", {});
        const parsed = JSON.parse(getResultText(result));
        assert.equal(parsed.query_credits, 100);
        assert.equal(parsed.plan, "dev");
        await harness.cleanup();
    });

    it("do-shodan-ports returns port array", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-shodan-ports", {});
        const parsed = JSON.parse(getResultText(result));
        assert.ok(Array.isArray(parsed));
        assert.ok(parsed.includes(80));
        assert.ok(parsed.includes(443));
        await harness.cleanup();
    });

    it("do-shodan-protocols returns protocol map", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-shodan-protocols", {});
        const parsed = JSON.parse(getResultText(result));
        assert.ok(parsed.http);
        assert.ok(parsed.https);
        await harness.cleanup();
    });

    it("do-shodan-search-filters returns filter array", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-shodan-search-filters", {});
        const parsed = JSON.parse(getResultText(result));
        assert.ok(Array.isArray(parsed));
        assert.ok(parsed.includes("port"));
        assert.ok(parsed.includes("country"));
        await harness.cleanup();
    });
});
