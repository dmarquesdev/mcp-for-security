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

describe("urldedupe-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("urldedupe");

    harness.server.tool(
        "do-urldedupe",
        "Deduplicates URLs by removing redundant URL and query parameter combinations",
        {
            urls: z.array(z.string()),
            regex_parse: z.boolean().optional(),
            similar: z.boolean().optional(),
            query_strings_only: z.boolean().optional(),
            no_extensions: z.boolean().optional(),
            ...TIMEOUT_SCHEMA,
        },
        async ({ urls, regex_parse, similar, query_strings_only, no_extensions, timeoutSeconds }, extra) => {
            const urldedupeArgs: string[] = [];

            if (regex_parse) urldedupeArgs.push("-r");
            if (similar) urldedupeArgs.push("-s");
            if (query_strings_only) urldedupeArgs.push("-qs");
            if (no_extensions) urldedupeArgs.push("-ne");

            const stdinData = urls.join("\n") + "\n";
            const result = await mock.spawn("urldedupe", urldedupeArgs, buildSpawnOptions(extra, { timeoutSeconds, stdinData }));
            return formatToolResult(result, { toolName: "urldedupe" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-urldedupe tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-urldedupe");
        await harness.cleanup();
    });

    it("single URL passes stdinData with trailing newline", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-urldedupe", {
            urls: ["https://example.com/page?id=1"],
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, []);
        assert.equal(last?.options?.stdinData, "https://example.com/page?id=1\n");
        await harness.cleanup();
    });

    it("multiple URLs are newline-joined in stdinData", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-urldedupe", {
            urls: ["https://a.com/x?a=1", "https://a.com/x?a=2", "https://b.com/y?b=1"],
        });
        const last = mock.lastCall();
        assert.equal(last?.options?.stdinData, "https://a.com/x?a=1\nhttps://a.com/x?a=2\nhttps://b.com/y?b=1\n");
        await harness.cleanup();
    });

    it("regex_parse appends -r flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-urldedupe", {
            urls: ["https://example.com/page?id=1"],
            regex_parse: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-r"));
        await harness.cleanup();
    });

    it("similar appends -s flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-urldedupe", {
            urls: ["https://example.com/page?id=1"],
            similar: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-s"));
        await harness.cleanup();
    });

    it("query_strings_only appends -qs flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-urldedupe", {
            urls: ["https://example.com/page?id=1"],
            query_strings_only: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-qs"));
        await harness.cleanup();
    });

    it("no_extensions appends -ne flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-urldedupe", {
            urls: ["https://example.com/page?id=1"],
            no_extensions: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-ne"));
        await harness.cleanup();
    });

    it("all flags combined build correct args and stdinData", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-urldedupe", {
            urls: ["https://example.com/page?id=1"],
            regex_parse: true,
            similar: true,
            query_strings_only: true,
            no_extensions: true,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-r", "-s", "-qs", "-ne"]);
        assert.equal(last?.options?.stdinData, "https://example.com/page?id=1\n");
        await harness.cleanup();
    });

    it("rejects when urls is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-urldedupe", {});
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
        const h = createTestServer("urldedupe-output");
        h.server.tool(
            "do-urldedupe",
            "deduplicate URLs",
            { urls: z.array(z.string()) },
            async ({ urls }) => {
                const stdinData = urls.join("\n") + "\n";
                const result = await customMock.spawn("urldedupe", [], { stdinData });
                return formatToolResult(result, { toolName: "urldedupe" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-urldedupe", {
            urls: ["https://example.com/page?id=1", "https://a.com/x?a=2", "https://b.com/y?b=1"],
        });
        const text = getResultText(result);
        assert.ok(text.includes("https://example.com/page?id=1"));
        assert.ok(text.includes("https://b.com/y?b=1"));
        await h.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-urldedupe", {
            urls: ["https://example.com/page?id=1"],
            timeoutSeconds: 120,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 120000);
        await harness.cleanup();
    });
});
