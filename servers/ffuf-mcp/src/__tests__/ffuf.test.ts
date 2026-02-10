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

describe("ffuf-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("ffuf");

    harness.server.tool(
        "do-ffuf",
        "Run ffuf web fuzzer with specified URL",
        {
            url: z.string().url(),
            ffuf_args: z.array(z.string()),
        },
        async ({ url, ffuf_args }) => {
            const result = await mock.spawn("ffuf", ["-u", url, ...ffuf_args]);
            return formatToolResult(result, { toolName: "ffuf", includeStderr: true });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-ffuf tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-ffuf");
        await harness.cleanup();
    });

    it("passes url and args to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-ffuf", {
            url: "https://example.com/FUZZ",
            ffuf_args: ["-w", "/tmp/wordlist.txt", "-mc", "200"],
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "ffuf");
        assert.deepEqual(mock.calls[0].args, [
            "-u", "https://example.com/FUZZ",
            "-w", "/tmp/wordlist.txt",
            "-mc", "200",
        ]);
        await harness.cleanup();
    });

    it("url is always first with -u prefix", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-ffuf", {
            url: "https://target.com/api/FUZZ",
            ffuf_args: ["-H", "Authorization: Bearer token"],
        });
        const last = mock.lastCall();
        assert.equal(last?.args[0], "-u");
        assert.equal(last?.args[1], "https://target.com/api/FUZZ");
        await harness.cleanup();
    });

    it("handles empty ffuf_args array", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-ffuf", {
            url: "https://example.com/FUZZ",
            ffuf_args: [],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "https://example.com/FUZZ"]);
        await harness.cleanup();
    });

    it("spreads multiple ffuf_args after url", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-ffuf", {
            url: "https://example.com/FUZZ",
            ffuf_args: ["-w", "/wordlist.txt", "-fc", "404", "-t", "50", "-json"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "-u", "https://example.com/FUZZ",
            "-w", "/wordlist.txt",
            "-fc", "404",
            "-t", "50",
            "-json",
        ]);
        await harness.cleanup();
    });

    it("rejects when url is not a valid URL", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-ffuf", {
            url: "not-a-valid-url",
            ffuf_args: [],
        });
        await harness.cleanup();
    });

    it("rejects when url is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-ffuf", {
            ffuf_args: ["-w", "/tmp/wordlist.txt"],
        });
        await harness.cleanup();
    });

    it("rejects when ffuf_args is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-ffuf", {
            url: "https://example.com/FUZZ",
        });
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: {
                stdout: "admin [Status: 200, Size: 1234]\nlogin [Status: 200, Size: 5678]",
                stderr: "",
                exitCode: 0,
            },
        });
        const h = createTestServer("ffuf-output");
        h.server.tool(
            "do-ffuf",
            "fuzz",
            {
                url: z.string().url(),
                ffuf_args: z.array(z.string()),
            },
            async ({ url, ffuf_args }) => {
                const result = await customMock.spawn("ffuf", ["-u", url, ...ffuf_args]);
                return formatToolResult(result, { toolName: "ffuf", includeStderr: true });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-ffuf", {
            url: "https://example.com/FUZZ",
            ffuf_args: ["-w", "/wordlist.txt"],
        });
        const text = getResultText(result);
        assert.ok(text.includes("admin"));
        assert.ok(text.includes("login"));
        await h.cleanup();
    });
});
