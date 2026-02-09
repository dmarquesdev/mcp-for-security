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
import { formatToolResult } from "mcp-shared";

describe("waybackurls-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("waybackurls");

    harness.server.tool(
        "do-waybackurls",
        "Fetch known URLs from the Wayback Machine archive for a given domain, useful for discovering historical endpoints.",
        {
            target: z.string().url().describe("Target domain to retrieve historical URLs from"),
            noSub: z.boolean().nullable().describe("When true, only retrieves URLs from the exact domain, excluding subdomains"),
        },
        async ({ target, noSub }) => {
            const waybackurlsArgs = [target, ...(noSub ? ['--no-subs'] : [])];
            const result = await mock.spawn("waybackurls", waybackurlsArgs);
            return formatToolResult(result, { toolName: "waybackurls" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-waybackurls tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-waybackurls");
        await harness.cleanup();
    });

    it("passes target to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-waybackurls", {
            target: "https://example.com",
            noSub: false,
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "waybackurls");
        assert.deepEqual(mock.calls[0].args, ["https://example.com"]);
        await harness.cleanup();
    });

    it("adds --no-subs flag when noSub is true", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-waybackurls", {
            target: "https://example.com",
            noSub: true,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["https://example.com", "--no-subs"]);
        await harness.cleanup();
    });

    it("omits --no-subs flag when noSub is null", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-waybackurls", {
            target: "https://example.com",
            noSub: null,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["https://example.com"]);
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "https://example.com/login\nhttps://example.com/api/v1", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("waybackurls-output");
        h.server.tool(
            "do-waybackurls",
            "Run waybackurls",
            {
                target: z.string().url(),
                noSub: z.boolean().nullable(),
            },
            async ({ target, noSub }) => {
                const waybackurlsArgs = [target, ...(noSub ? ['--no-subs'] : [])];
                const result = await customMock.spawn("waybackurls", waybackurlsArgs);
                return formatToolResult(result, { toolName: "waybackurls" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-waybackurls", {
            target: "https://example.com",
            noSub: false,
        });
        const text = getResultText(result);
        assert.ok(text.includes("https://example.com/login"));
        await h.cleanup();
    });

    it("rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-waybackurls", {
            noSub: false,
        });
        await harness.cleanup();
    });

    it("rejects when target is not a valid URL", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-waybackurls", {
            target: "not-a-url",
            noSub: false,
        });
        await harness.cleanup();
    });

    it("rejects when noSub is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-waybackurls", {
            target: "https://example.com",
        });
        await harness.cleanup();
    });
});
