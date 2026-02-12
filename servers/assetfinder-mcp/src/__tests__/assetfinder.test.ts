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

describe("assetfinder-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("assetfinder");

    harness.server.tool(
        "do-assetfinder",
        "Find related domains and subdomains using assetfinder for a given target.",
        {
            target: z.string().describe("The root domain (e.g., example.com) to discover associated subdomains and related domains."),
            ...TIMEOUT_SCHEMA,
        },
        async ({ target, timeoutSeconds }, extra) => {
            const result = await mock.spawn("assetfinder", ["-subs-only", target], buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "assetfinder" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-assetfinder tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-assetfinder");
        await harness.cleanup();
    });

    it("passes -subs-only and target to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-assetfinder", {
            target: "example.com",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "assetfinder");
        assert.deepEqual(mock.calls[0].args, ["-subs-only", "example.com"]);
        await harness.cleanup();
    });

    it("always includes -subs-only flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-assetfinder", {
            target: "test.io",
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-subs-only"));
        assert.equal(last?.args[0], "-subs-only");
        assert.equal(last?.args[1], "test.io");
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "sub1.example.com\nsub2.example.com\napi.example.com", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("assetfinder-output");
        h.server.tool(
            "do-assetfinder",
            "Run assetfinder",
            {
                target: z.string(),
            },
            async ({ target }) => {
                const result = await customMock.spawn("assetfinder", ["-subs-only", target]);
                return formatToolResult(result, { toolName: "assetfinder" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-assetfinder", {
            target: "example.com",
        });
        const text = getResultText(result);
        assert.ok(text.includes("sub1.example.com"));
        assert.ok(text.includes("api.example.com"));
        await h.cleanup();
    });

    it("rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-assetfinder", {});
        await harness.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-assetfinder", {
            target: "example.com",
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
