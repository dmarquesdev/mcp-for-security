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

describe("nuclei-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("nuclei");

    // Register do-nuclei tool matching server implementation
    harness.server.tool(
        "do-nuclei",
        "Execute Nuclei vulnerability scanner",
        {
            url: z.string().url().describe("Target URL to run nuclei"),
            tags: z.array(z.string()).optional().describe("Tags to filter nuclei templates"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ url, tags, timeoutSeconds }, extra) => {
            const nucleiArgs = ["-u", url, "-silent"];
            if (tags && tags.length > 0) nucleiArgs.push("-tags", tags.join(","));

            const result = await mock.spawn("nuclei", nucleiArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "nuclei" });
        }
    );

    // Register do-nuclei-tags tool (fetch-based, simplified for test)
    harness.server.tool(
        "do-nuclei-tags",
        "Get available Nuclei template tags",
        {},
        async () => {
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(["cve", "rce", "xss", "sqli"]),
                }],
            };
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-nuclei tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-nuclei");
        await harness.cleanup();
    });

    it("registers the do-nuclei-tags tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-nuclei-tags");
        await harness.cleanup();
    });

    it("passes url with -silent flag to spawn", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-nuclei", {
            url: "https://example.com",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "nuclei");
        assert.deepEqual(mock.calls[0].args, ["-u", "https://example.com", "-silent"]);
        await harness.cleanup();
    });

    it("appends -tags flag when tags are provided", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-nuclei", {
            url: "https://example.com",
            tags: ["cve", "rce"],
        });
        assert.equal(mock.calls.length, 1);
        assert.deepEqual(mock.calls[0].args, [
            "-u", "https://example.com", "-silent", "-tags", "cve,rce",
        ]);
        await harness.cleanup();
    });

    it("does not append -tags when tags array is empty", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-nuclei", {
            url: "https://example.com",
            tags: [],
        });
        assert.equal(mock.calls.length, 1);
        assert.deepEqual(mock.calls[0].args, ["-u", "https://example.com", "-silent"]);
        await harness.cleanup();
    });

    it("omits tags when not provided", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-nuclei", {
            url: "https://example.com",
        });
        const last = mock.lastCall();
        assert.ok(!last?.args.includes("-tags"), "should not include -tags flag");
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "[CVE-2021-44228] Log4Shell detected", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("nuclei-output");
        h.server.tool(
            "do-nuclei",
            "Run nuclei",
            {
                url: z.string().url(),
                tags: z.array(z.string()).optional(),
            },
            async ({ url, tags }) => {
                const nucleiArgs = ["-u", url, "-silent"];
                if (tags && tags.length > 0) nucleiArgs.push("-tags", tags.join(","));
                const result = await customMock.spawn("nuclei", nucleiArgs);
                return formatToolResult(result, { toolName: "nuclei" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-nuclei", {
            url: "https://target.com",
        });
        const text = getResultText(result);
        assert.ok(text.includes("Log4Shell detected"));
        await h.cleanup();
    });

    it("rejects when url is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-nuclei", {});
        await harness.cleanup();
    });

    it("rejects when url is not a valid URL", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-nuclei", {
            url: "not-a-url",
        });
        await harness.cleanup();
    });

    it("do-nuclei-tags returns tag list", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-nuclei-tags", {});
        const text = getResultText(result);
        assert.ok(text.includes("cve"));
        assert.ok(text.includes("rce"));
        await harness.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-nuclei", {
            url: "https://example.com",
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
