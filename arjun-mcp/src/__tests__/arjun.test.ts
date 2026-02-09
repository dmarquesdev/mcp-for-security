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

describe("arjun-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("arjun");

    harness.server.tool(
        "do-arjun",
        "Run Arjun to discover hidden HTTP parameters",
        {
            url: z.string().url().describe("Target URL to scan for hidden parameters"),
            textFile: z.string().optional().describe("Path to file containing multiple URLs"),
            wordlist: z.string().optional().describe("Path to custom wordlist file"),
            method: z.enum(["GET", "POST", "JSON", "HEADERS"]).optional().describe("HTTP method to use (default: GET)"),
            rateLimit: z.number().optional().describe("Maximum requests per second (default: 9999)"),
            chunkSize: z.number().optional().describe("Chunk size - number of parameters to send at once"),
        },
        async ({ url, textFile, wordlist, method, rateLimit, chunkSize }) => {
            const arjunArgs: string[] = [];
            if (!url && !textFile) throw new Error("url or textFile parameter required");
            if (url) arjunArgs.push("-u", url);
            if (textFile) arjunArgs.push("-f", textFile);
            if (wordlist) arjunArgs.push("-w", wordlist);
            if (method) arjunArgs.push("-m", method);
            if (rateLimit) arjunArgs.push("--rate-limit", rateLimit.toString());
            if (chunkSize) arjunArgs.push("--chunk-size", chunkSize.toString());

            const result = await mock.spawn("arjun", arjunArgs);
            return formatToolResult(result, { toolName: "arjun", stripAnsi: true });
        },
    );

    afterEach(() => mock.reset());

    it("registers the do-arjun tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-arjun");
        await harness.cleanup();
    });

    it("passes url to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-arjun", {
            url: "http://example.com/api",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "arjun");
        assert.deepEqual(mock.calls[0].args, ["-u", "http://example.com/api"]);
        await harness.cleanup();
    });

    it("passes all optional parameters correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-arjun", {
            url: "http://example.com/api",
            wordlist: "/tmp/wordlist.txt",
            method: "POST",
            rateLimit: 100,
            chunkSize: 50,
        });
        assert.equal(mock.calls.length, 1);
        assert.deepEqual(mock.calls[0].args, [
            "-u", "http://example.com/api",
            "-w", "/tmp/wordlist.txt",
            "-m", "POST",
            "--rate-limit", "100",
            "--chunk-size", "50",
        ]);
        await harness.cleanup();
    });

    it("includes textFile flag when provided", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-arjun", {
            url: "http://example.com",
            textFile: "/tmp/urls.txt",
        });
        const last = mock.lastCall();
        assert.ok(last);
        assert.deepEqual(last.args, ["-u", "http://example.com", "-f", "/tmp/urls.txt"]);
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "Found: id, name, page", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("arjun-output");
        h.server.tool(
            "do-arjun",
            "Run Arjun",
            {
                url: z.string().url(),
                textFile: z.string().optional(),
                wordlist: z.string().optional(),
                method: z.enum(["GET", "POST", "JSON", "HEADERS"]).optional(),
                rateLimit: z.number().optional(),
                chunkSize: z.number().optional(),
            },
            async ({ url }) => {
                const result = await customMock.spawn("arjun", ["-u", url]);
                return formatToolResult(result, { toolName: "arjun", stripAnsi: true });
            },
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-arjun", {
            url: "http://example.com/api",
        });
        const text = getResultText(result);
        assert.ok(text.includes("Found: id, name, page"));
        await h.cleanup();
    });

    it("rejects when url is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-arjun", {});
        await harness.cleanup();
    });

    it("rejects when url is not a valid URL", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-arjun", {
            url: "not-a-url",
        });
        await harness.cleanup();
    });
});
