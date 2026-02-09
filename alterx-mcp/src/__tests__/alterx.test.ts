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

describe("alterx-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("alterx");

    harness.server.tool(
        "do-alterx",
        "Execute Alterx, a tool that generates domain wordlists using pattern-based permutations",
        {
            domain: z.string().describe("Target domain or subdomains"),
            pattern: z.string().describe("Pattern template for generating wordlist variations"),
            outputFilePath: z.string().nullable().describe("Path where the generated wordlist should be saved (optional)"),
        },
        async ({ domain, pattern, outputFilePath }) => {
            const alterxArgs = ["-l", domain, "-p", pattern];
            if (outputFilePath != null) alterxArgs.push("-o", outputFilePath);

            const result = await mock.spawn("alterx", alterxArgs);
            return formatToolResult(result, { toolName: "alterx" });
        },
    );

    afterEach(() => mock.reset());

    it("registers the do-alterx tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-alterx");
        await harness.cleanup();
    });

    it("passes domain and pattern to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-alterx", {
            domain: "example.com",
            pattern: "{{word}}-{{sub}}.{{suffix}}",
            outputFilePath: null,
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "alterx");
        assert.deepEqual(mock.calls[0].args, [
            "-l", "example.com",
            "-p", "{{word}}-{{sub}}.{{suffix}}",
        ]);
        await harness.cleanup();
    });

    it("includes output file path when provided", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-alterx", {
            domain: "example.com",
            pattern: "{{word}}.{{suffix}}",
            outputFilePath: "/tmp/wordlist-output.txt",
        });
        const last = mock.lastCall();
        assert.ok(last);
        assert.deepEqual(last.args, [
            "-l", "example.com",
            "-p", "{{word}}.{{suffix}}",
            "-o", "/tmp/wordlist-output.txt",
        ]);
        await harness.cleanup();
    });

    it("omits -o flag when outputFilePath is null", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-alterx", {
            domain: "example.com",
            pattern: "{{word}}.{{suffix}}",
            outputFilePath: null,
        });
        const last = mock.lastCall();
        assert.ok(last);
        assert.ok(!last.args.includes("-o"));
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: {
                stdout: "dev-api.example.com\nstaging-api.example.com\ntest-api.example.com",
                stderr: "",
                exitCode: 0,
            },
        });
        const h = createTestServer("alterx-output");
        h.server.tool(
            "do-alterx",
            "Execute Alterx",
            {
                domain: z.string(),
                pattern: z.string(),
                outputFilePath: z.string().nullable(),
            },
            async ({ domain, pattern, outputFilePath }) => {
                const args = ["-l", domain, "-p", pattern];
                if (outputFilePath != null) args.push("-o", outputFilePath);
                const result = await customMock.spawn("alterx", args);
                return formatToolResult(result, { toolName: "alterx" });
            },
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-alterx", {
            domain: "example.com",
            pattern: "{{word}}-api.{{suffix}}",
            outputFilePath: null,
        });
        const text = getResultText(result);
        assert.ok(text.includes("dev-api.example.com"));
        assert.ok(text.includes("staging-api.example.com"));
        await h.cleanup();
    });

    it("rejects when domain is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-alterx", {
            pattern: "{{word}}.{{suffix}}",
            outputFilePath: null,
        });
        await harness.cleanup();
    });

    it("rejects when pattern is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-alterx", {
            domain: "example.com",
            outputFilePath: null,
        });
        await harness.cleanup();
    });

    it("rejects when outputFilePath is missing entirely", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-alterx", {
            domain: "example.com",
            pattern: "{{word}}.{{suffix}}",
        });
        await harness.cleanup();
    });
});
