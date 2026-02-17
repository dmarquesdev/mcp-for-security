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

describe("uro-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("uro");

    harness.server.tool(
        "do-uro",
        "Deduplicate and filter URLs using smart pattern removal",
        {
            urls: z.array(z.string()),
            whitelist: z.array(z.string()).optional(),
            blacklist: z.array(z.string()).optional(),
            filters: z.array(z.string()).optional(),
            ...TIMEOUT_SCHEMA,
        },
        async ({ urls, whitelist, blacklist, filters, timeoutSeconds }, extra) => {
            const uroArgs: string[] = [];

            if (whitelist && whitelist.length > 0) {
                uroArgs.push("-w", ...whitelist);
            }
            if (blacklist && blacklist.length > 0) {
                uroArgs.push("-b", ...blacklist);
            }
            if (filters && filters.length > 0) {
                uroArgs.push("-f", filters.join(","));
            }

            const stdinData = urls.join("\n") + "\n";
            const result = await mock.spawn("uro", uroArgs, buildSpawnOptions(extra, { timeoutSeconds, stdinData }));
            return formatToolResult(result, { toolName: "uro", stripAnsi: true });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-uro tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-uro");
        await harness.cleanup();
    });

    it("single URL passes stdinData with trailing newline", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-uro", {
            urls: ["https://example.com/page?id=1"],
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, []);
        assert.equal(last?.options?.stdinData, "https://example.com/page?id=1\n");
        await harness.cleanup();
    });

    it("multiple URLs are newline-joined in stdinData", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-uro", {
            urls: ["https://a.com/x?a=1", "https://a.com/x?a=2", "https://b.com/y?b=1"],
        });
        const last = mock.lastCall();
        assert.equal(last?.options?.stdinData, "https://a.com/x?a=1\nhttps://a.com/x?a=2\nhttps://b.com/y?b=1\n");
        await harness.cleanup();
    });

    it("whitelist appends -w followed by each extension", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-uro", {
            urls: ["https://example.com/page"],
            whitelist: ["php", "asp"],
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-w", "php", "asp"]);
        await harness.cleanup();
    });

    it("blacklist appends -b followed by each extension", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-uro", {
            urls: ["https://example.com/page"],
            blacklist: ["jpg", "png", "css"],
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-b", "jpg", "png", "css"]);
        await harness.cleanup();
    });

    it("filters appends -f with comma-joined values", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-uro", {
            urls: ["https://example.com/page?id=1"],
            filters: ["hasparams", "vuln"],
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-f", "hasparams,vuln"]);
        await harness.cleanup();
    });

    it("all flags combined build correct args and stdinData", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-uro", {
            urls: ["https://example.com/page?id=1"],
            whitelist: ["php"],
            blacklist: ["jpg"],
            filters: ["hasparams", "keepcontent"],
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-w", "php", "-b", "jpg", "-f", "hasparams,keepcontent"]);
        assert.equal(last?.options?.stdinData, "https://example.com/page?id=1\n");
        await harness.cleanup();
    });

    it("rejects when urls is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-uro", {});
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: {
                stdout: "https://example.com/page?id=1\nhttps://b.com/y?b=1",
                stderr: "",
                exitCode: 0,
            },
        });
        const h = createTestServer("uro-output");
        h.server.tool(
            "do-uro",
            "deduplicate URLs",
            { urls: z.array(z.string()) },
            async ({ urls }) => {
                const stdinData = urls.join("\n") + "\n";
                const result = await customMock.spawn("uro", [], { stdinData });
                return formatToolResult(result, { toolName: "uro", stripAnsi: true });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-uro", {
            urls: ["https://example.com/page?id=1", "https://a.com/x?a=2", "https://b.com/y?b=1"],
        });
        const text = getResultText(result);
        assert.ok(text.includes("https://example.com/page?id=1"));
        assert.ok(text.includes("https://b.com/y?b=1"));
        await h.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-uro", {
            urls: ["https://example.com/page?id=1"],
            timeoutSeconds: 120,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 120000);
        await harness.cleanup();
    });
});
