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

describe("subfinder-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("subfinder");

    harness.server.tool(
        "do-subfinder",
        "Fast passive subdomain enumeration tool that discovers valid subdomains using online passive sources.",
        {
            domain: z.string().describe("Target domain to enumerate subdomains for (e.g., example.com)"),
            sources: z.array(z.string()).optional().describe("Specific sources to use (e.g., crtsh, shodan, virustotal)"),
            exclude_sources: z.array(z.string()).optional().describe("Sources to exclude from enumeration"),
            all: z.boolean().optional().describe("Use all sources (includes API-dependent sources)"),
            recursive: z.boolean().optional().describe("Use recursive enumeration on discovered subdomains"),
            json: z.boolean().optional().describe("Output in JSON Lines format"),
            active: z.boolean().optional().describe("Display only active subdomains (performs DNS resolution)"),
            collect_sources: z.boolean().optional().describe("Include source information in JSON output"),
            ip: z.boolean().optional().describe("Include IP addresses in output"),
            timeout: z.number().optional().describe("Timeout in seconds for enumeration"),
            rate_limit: z.number().optional().describe("Maximum number of HTTP requests per second"),
            resolvers: z.array(z.string()).optional().describe("Custom DNS resolvers to use (e.g., 8.8.8.8, 1.1.1.1)"),
            match: z.array(z.string()).optional().describe("Match subdomain patterns to include"),
            filter: z.array(z.string()).optional().describe("Filter out subdomain patterns to exclude"),
            verbose: z.boolean().optional().describe("Show verbose output with additional details"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ domain, sources, exclude_sources, all, recursive, json, active, collect_sources, ip, timeout, rate_limit, resolvers, match, filter, verbose, timeoutSeconds }, extra) => {
            const subfinderArgs = ["-d", domain, "-silent"];

            if (sources && sources.length > 0) subfinderArgs.push("-s", sources.join(","));
            if (exclude_sources && exclude_sources.length > 0) subfinderArgs.push("-es", exclude_sources.join(","));
            if (all) subfinderArgs.push("-all");
            if (recursive) subfinderArgs.push("-recursive");
            if (json) subfinderArgs.push("-oJ");
            if (active) subfinderArgs.push("-nW");
            if (collect_sources) subfinderArgs.push("-cs");
            if (ip) subfinderArgs.push("-oI");
            if (timeout) subfinderArgs.push("-timeout", timeout.toString());
            if (rate_limit) subfinderArgs.push("-rl", rate_limit.toString());
            if (resolvers && resolvers.length > 0) subfinderArgs.push("-r", resolvers.join(","));
            if (match && match.length > 0) subfinderArgs.push("-m", match.join(","));
            if (filter && filter.length > 0) subfinderArgs.push("-f", filter.join(","));
            if (verbose) subfinderArgs.push("-v");

            const result = await mock.spawn("subfinder", subfinderArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "subfinder" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-subfinder tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-subfinder");
        await harness.cleanup();
    });

    it("passes domain with -d and -silent flags", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-subfinder", {
            domain: "example.com",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "subfinder");
        assert.deepEqual(mock.calls[0].args, ["-d", "example.com", "-silent"]);
        await harness.cleanup();
    });

    it("adds sources flag with comma-joined values", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-subfinder", {
            domain: "example.com",
            sources: ["crtsh", "shodan"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-d", "example.com", "-silent", "-s", "crtsh,shodan"]);
        await harness.cleanup();
    });

    it("adds -all flag when all is true", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-subfinder", {
            domain: "example.com",
            all: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-all"));
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "api.example.com\nwww.example.com\nmail.example.com", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("subfinder-output");
        h.server.tool(
            "do-subfinder",
            "Run subfinder",
            {
                domain: z.string(),
                sources: z.array(z.string()).optional(),
            },
            async ({ domain, sources }) => {
                const subfinderArgs = ["-d", domain, "-silent"];
                if (sources && sources.length > 0) subfinderArgs.push("-s", sources.join(","));
                const result = await customMock.spawn("subfinder", subfinderArgs);
                return formatToolResult(result, { toolName: "subfinder" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-subfinder", {
            domain: "example.com",
        });
        const text = getResultText(result);
        assert.ok(text.includes("api.example.com"));
        assert.ok(text.includes("www.example.com"));
        await h.cleanup();
    });

    it("rejects when domain is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-subfinder", {
            sources: ["crtsh"],
        });
        await harness.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-subfinder", {
            domain: "example.com",
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
