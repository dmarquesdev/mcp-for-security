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

const SHUFFLEDNS_PATH = "shuffledns";
const MASSDNS_PATH = "/usr/bin/massdns";

describe("shuffledns-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("shuffledns");

    harness.server.tool(
        "do-shuffledns",
        "DNS brute force and resolution using shuffledns",
        {
            target: z.string().describe("Target domain (e.g., example.com)"),
            resolver: z.string().describe("Resolver file path"),
            mode: z.enum(["bruteforce", "resolve", "filter"]).describe("Operation mode"),
            wordlist: z.string().describe("Wordlist file path"),
            rateLimit: z.number().optional().describe("Rate limit for requests"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ target, resolver, mode, wordlist, rateLimit, timeoutSeconds }, extra) => {
            const shufflednsArgs = ["-d", target, "-r", resolver, "-mode", mode, "-w", wordlist, "-m", MASSDNS_PATH, "-silent"];
            if (rateLimit) shufflednsArgs.push("-t", rateLimit.toString());

            const result = await mock.spawn(SHUFFLEDNS_PATH, shufflednsArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "shuffledns" });
        },
    );

    afterEach(() => mock.reset());

    it("registers the do-shuffledns tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-shuffledns");
        await harness.cleanup();
    });

    it("passes all required args to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-shuffledns", {
            target: "example.com",
            resolver: "/tmp/resolvers.txt",
            mode: "bruteforce",
            wordlist: "/tmp/wordlist.txt",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "shuffledns");
        assert.deepEqual(mock.calls[0].args, [
            "-d", "example.com",
            "-r", "/tmp/resolvers.txt",
            "-mode", "bruteforce",
            "-w", "/tmp/wordlist.txt",
            "-m", "/usr/bin/massdns",
            "-silent",
        ]);
        await harness.cleanup();
    });

    it("includes rate limit when provided", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-shuffledns", {
            target: "example.com",
            resolver: "/tmp/resolvers.txt",
            mode: "resolve",
            wordlist: "/tmp/wordlist.txt",
            rateLimit: 1000,
        });
        const last = mock.lastCall();
        assert.ok(last);
        assert.deepEqual(last.args, [
            "-d", "example.com",
            "-r", "/tmp/resolvers.txt",
            "-mode", "resolve",
            "-w", "/tmp/wordlist.txt",
            "-m", "/usr/bin/massdns",
            "-silent",
            "-t", "1000",
        ]);
        await harness.cleanup();
    });

    it("supports filter mode", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-shuffledns", {
            target: "example.com",
            resolver: "/tmp/resolvers.txt",
            mode: "filter",
            wordlist: "/tmp/wordlist.txt",
        });
        const last = mock.lastCall();
        assert.ok(last);
        assert.ok(last.args.includes("-mode"));
        assert.ok(last.args.includes("filter"));
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "sub1.example.com\nsub2.example.com\nsub3.example.com", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("shuffledns-output");
        h.server.tool(
            "do-shuffledns",
            "DNS brute force",
            {
                target: z.string(),
                resolver: z.string(),
                mode: z.enum(["bruteforce", "resolve", "filter"]),
                wordlist: z.string(),
                rateLimit: z.number().optional(),
            },
            async ({ target, resolver, mode, wordlist, rateLimit }) => {
                const args = ["-d", target, "-r", resolver, "-mode", mode, "-w", wordlist, "-m", MASSDNS_PATH, "-silent"];
                if (rateLimit) args.push("-t", rateLimit.toString());
                const result = await customMock.spawn(SHUFFLEDNS_PATH, args);
                return formatToolResult(result, { toolName: "shuffledns" });
            },
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-shuffledns", {
            target: "example.com",
            resolver: "/tmp/resolvers.txt",
            mode: "bruteforce",
            wordlist: "/tmp/wordlist.txt",
        });
        const text = getResultText(result);
        assert.ok(text.includes("sub1.example.com"));
        assert.ok(text.includes("sub3.example.com"));
        await h.cleanup();
    });

    it("rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-shuffledns", {
            resolver: "/tmp/resolvers.txt",
            mode: "bruteforce",
            wordlist: "/tmp/wordlist.txt",
        });
        await harness.cleanup();
    });

    it("rejects when mode is invalid", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-shuffledns", {
            target: "example.com",
            resolver: "/tmp/resolvers.txt",
            mode: "invalid-mode",
            wordlist: "/tmp/wordlist.txt",
        });
        await harness.cleanup();
    });

    it("rejects when resolver is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-shuffledns", {
            target: "example.com",
            mode: "bruteforce",
            wordlist: "/tmp/wordlist.txt",
        });
        await harness.cleanup();
    });

    it("rejects when wordlist is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-shuffledns", {
            target: "example.com",
            resolver: "/tmp/resolvers.txt",
            mode: "bruteforce",
        });
        await harness.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-shuffledns", {
            target: "example.com",
            resolver: "/tmp/resolvers.txt",
            mode: "bruteforce",
            wordlist: "/tmp/wordlist.txt",
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
