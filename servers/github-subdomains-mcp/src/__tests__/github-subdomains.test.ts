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

describe("github-subdomains-mcp", () => {
    const GITHUB_TOKEN = "test-token-123";
    const mock = createMockSpawn();
    const harness = createTestServer("github-subdomains");

    // Register the tool matching server implementation
    harness.server.tool(
        "do-github-subdomains",
        "Discover subdomains by searching GitHub code",
        {
            domain: z.string().describe("Target domain"),
            extended: z.boolean().optional().describe("Extended search mode"),
            exit_on_rate_limit: z.boolean().optional().describe("Exit when rate-limited"),
            raw: z.boolean().optional().describe("Display raw results"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ domain, extended, exit_on_rate_limit, raw, timeoutSeconds }, extra) => {
            const toolArgs = ["-d", domain];
            if (GITHUB_TOKEN) toolArgs.push("-t", GITHUB_TOKEN);
            if (extended) toolArgs.push("-e");
            if (exit_on_rate_limit) toolArgs.push("-k");
            if (raw) toolArgs.push("-raw");

            const result = await mock.spawn("github-subdomains", toolArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "github-subdomains", includeStderr: true });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-github-subdomains tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-github-subdomains");
        await harness.cleanup();
    });

    it("passes domain and token to spawn", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-github-subdomains", {
            domain: "example.com",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "github-subdomains");
        assert.deepEqual(mock.calls[0].args, ["-d", "example.com", "-t", GITHUB_TOKEN]);
        await harness.cleanup();
    });

    it("appends -e flag when extended is true", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-github-subdomains", {
            domain: "example.com",
            extended: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-e"), "should include -e flag");
        assert.deepEqual(last?.args, ["-d", "example.com", "-t", GITHUB_TOKEN, "-e"]);
        await harness.cleanup();
    });

    it("appends -k flag when exit_on_rate_limit is true", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-github-subdomains", {
            domain: "example.com",
            exit_on_rate_limit: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-k"), "should include -k flag");
        await harness.cleanup();
    });

    it("appends -raw flag when raw is true", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-github-subdomains", {
            domain: "example.com",
            raw: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-raw"), "should include -raw flag");
        await harness.cleanup();
    });

    it("combines all optional flags correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-github-subdomains", {
            domain: "target.io",
            extended: true,
            exit_on_rate_limit: true,
            raw: true,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "-d", "target.io", "-t", GITHUB_TOKEN, "-e", "-k", "-raw",
        ]);
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "api.example.com\ndev.example.com", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("github-subdomains-output");
        h.server.tool(
            "do-github-subdomains",
            "Discover subdomains",
            {
                domain: z.string(),
                extended: z.boolean().optional(),
                exit_on_rate_limit: z.boolean().optional(),
                raw: z.boolean().optional(),
            },
            async ({ domain }) => {
                const result = await customMock.spawn("github-subdomains", ["-d", domain]);
                return formatToolResult(result, { toolName: "github-subdomains", includeStderr: true });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-github-subdomains", {
            domain: "example.com",
        });
        const text = getResultText(result);
        assert.ok(text.includes("api.example.com"));
        assert.ok(text.includes("dev.example.com"));
        await h.cleanup();
    });

    it("rejects when domain is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-github-subdomains", {});
        await harness.cleanup();
    });

    it("does not include optional flags when not set", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-github-subdomains", {
            domain: "example.com",
        });
        const last = mock.lastCall();
        assert.ok(!last?.args.includes("-e"), "should not include -e");
        assert.ok(!last?.args.includes("-k"), "should not include -k");
        assert.ok(!last?.args.includes("-raw"), "should not include -raw");
        await harness.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-github-subdomains", {
            domain: "example.com",
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
