import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
    createTestServer,
    createMockSpawn,
    assertToolExists,
    assertToolCallSucceeds,
    assertToolCallFails,
    getResultText,
} from "test-helpers";
import { formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

describe("asnmap-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("asnmap");

    harness.server.tool(
        "do-asnmap",
        "Map ASN data to CIDR ranges.",
        {
            asn: z.string().optional().describe("ASN to lookup (e.g., AS14421)"),
            ip: z.string().optional().describe("IP address to lookup"),
            domain: z.string().optional().describe("Domain name to lookup"),
            org: z.string().optional().describe("Organization name to lookup"),
            json: z.boolean().optional().describe("Output in JSON format"),
            csv: z.boolean().optional().describe("Output in CSV format"),
            ipv6: z.boolean().optional().describe("Include IPv6 CIDR ranges"),
            resolvers: z.string().optional().describe("Custom resolver list"),
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

            const result = await mock.spawn("asnmap", asnmapArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "asnmap" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-asnmap tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-asnmap");
        await harness.cleanup();
    });

    it("passes ASN with -a flag and -silent", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-asnmap", {
            asn: "AS14421",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "asnmap");
        assert.deepEqual(mock.calls[0].args, ["-a", "AS14421", "-silent", "-disable-update-check"]);
        await harness.cleanup();
    });

    it("passes IP with -i flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-asnmap", {
            ip: "1.1.1.1",
        });
        assert.deepEqual(mock.lastCall()?.args, ["-i", "1.1.1.1", "-silent", "-disable-update-check"]);
        await harness.cleanup();
    });

    it("passes domain with -d flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-asnmap", {
            domain: "cloudflare.com",
        });
        assert.deepEqual(mock.lastCall()?.args, ["-d", "cloudflare.com", "-silent", "-disable-update-check"]);
        await harness.cleanup();
    });

    it("passes org with -org flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-asnmap", {
            org: "Cloudflare",
        });
        assert.deepEqual(mock.lastCall()?.args, ["-org", "Cloudflare", "-silent", "-disable-update-check"]);
        await harness.cleanup();
    });

    it("adds -json flag when json is true", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-asnmap", {
            asn: "AS14421",
            json: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-json"));
        await harness.cleanup();
    });

    it("adds -csv flag when csv is true", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-asnmap", {
            asn: "AS14421",
            csv: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-csv"));
        await harness.cleanup();
    });

    it("adds -v6 flag when ipv6 is true", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-asnmap", {
            asn: "AS14421",
            ipv6: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-v6"));
        await harness.cleanup();
    });

    it("rejects when no lookup parameter provided", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-asnmap", {});
        await harness.cleanup();
    });

    it("accepts multiple lookup parameters", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-asnmap", {
            asn: "AS14421",
            domain: "cloudflare.com",
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-a"));
        assert.ok(last?.args.includes("-d"));
        await harness.cleanup();
    });

    it("returns output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: '{"asn":"AS13335","first_ip":"1.0.0.0","last_ip":"1.0.0.255","country":"US"}', stderr: "", exitCode: 0 },
        });
        const h = createTestServer("asnmap-output");
        h.server.tool(
            "do-asnmap",
            "Run asnmap",
            {
                asn: z.string().optional(),
            },
            async ({ asn }) => {
                const asnmapArgs: string[] = [];
                if (asn) asnmapArgs.push("-a", asn);
                asnmapArgs.push("-silent");
                const result = await customMock.spawn("asnmap", asnmapArgs);
                return formatToolResult(result, { toolName: "asnmap" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-asnmap", {
            asn: "AS13335",
        });
        const text = getResultText(result);
        assert.ok(text.includes("AS13335"));
        assert.ok(text.includes("1.0.0.0"));
        await h.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-asnmap", {
            asn: "AS14421",
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
