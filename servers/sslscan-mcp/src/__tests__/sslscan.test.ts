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

describe("sslscan-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("sslscan");

    harness.server.tool(
        "do-sslscan",
        "Execute SSLScan to identify supported cipher suites, TLS versions, certificate info, and security issues in SSL/TLS configurations.",
        {
            target: z.string().url().describe("Target URL to scan (must begin with https://)"),
            sslscan_args: z.array(z.string()).describe("Additional sslscan arguments (e.g. --show-certificate, --no-colour, --ssl2, --tls13, --xml)"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ target, sslscan_args, timeoutSeconds }, extra) => {
            const result = await mock.spawn("sslscan", [...sslscan_args, target], buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "sslscan", includeStderr: true });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-sslscan tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-sslscan");
        await harness.cleanup();
    });

    it("passes target and args to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-sslscan", {
            target: "https://example.com",
            sslscan_args: ["--show-certificate", "--no-colour"],
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "sslscan");
        assert.deepEqual(mock.calls[0].args, ["--show-certificate", "--no-colour", "https://example.com"]);
        await harness.cleanup();
    });

    it("places sslscan_args before target", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-sslscan", {
            target: "https://test.com",
            sslscan_args: ["--tls13"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["--tls13", "https://test.com"]);
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "TLSv1.3  256 bits  TLS_AES_256_GCM_SHA384", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("sslscan-output");
        h.server.tool(
            "do-sslscan",
            "Run sslscan",
            {
                target: z.string().url(),
                sslscan_args: z.array(z.string()),
            },
            async ({ target, sslscan_args }) => {
                const result = await customMock.spawn("sslscan", [...sslscan_args, target]);
                return formatToolResult(result, { toolName: "sslscan", includeStderr: true });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-sslscan", {
            target: "https://example.com",
            sslscan_args: [],
        });
        const text = getResultText(result);
        assert.ok(text.includes("TLS_AES_256_GCM_SHA384"));
        await h.cleanup();
    });

    it("handles empty sslscan_args array", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-sslscan", {
            target: "https://example.com",
            sslscan_args: [],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["https://example.com"]);
        await harness.cleanup();
    });

    it("rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-sslscan", {
            sslscan_args: ["--tls13"],
        });
        await harness.cleanup();
    });

    it("rejects when target is not a valid URL", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-sslscan", {
            target: "not-a-url",
            sslscan_args: [],
        });
        await harness.cleanup();
    });

    it("rejects when sslscan_args is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-sslscan", {
            target: "https://example.com",
        });
        await harness.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-sslscan", {
            target: "https://example.com",
            sslscan_args: [],
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
