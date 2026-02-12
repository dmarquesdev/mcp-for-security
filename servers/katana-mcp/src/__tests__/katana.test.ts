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

describe("katana-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("katana");

    harness.server.tool(
        "do-katana",
        "Performs fast and configurable web crawling",
        {
            target: z.array(z.string()),
            exclude: z.array(z.string()).optional(),
            depth: z.number().optional(),
            js_crawl: z.boolean().optional(),
            jsluice: z.boolean().optional(),
            headers: z.array(z.string()).optional(),
            strategy: z.enum(["depth-first", "breadth-first"]).optional(),
            headless: z.boolean().optional(),
            system_chrome: z.boolean().optional(),
            show_browser: z.boolean().optional(),
            ...TIMEOUT_SCHEMA,
        },
        async ({ target, exclude, depth, js_crawl, jsluice, headers, strategy, headless, system_chrome, show_browser, timeoutSeconds }, extra) => {
            const katanaArgs = ["-u", target.join(","), "-silent"];

            if (exclude && exclude.length > 0) katanaArgs.push("-exclude", exclude.join(","));
            if (depth !== undefined) katanaArgs.push("-d", depth.toString());
            if (js_crawl) katanaArgs.push("-jc");
            if (jsluice) katanaArgs.push("-jsl");
            if (headers && headers.length > 0) headers.forEach(header => katanaArgs.push("-H", header));
            if (strategy) katanaArgs.push("-strategy", strategy);
            if (headless) katanaArgs.push("-headless");
            if (system_chrome) katanaArgs.push("-system-chrome");
            if (show_browser) katanaArgs.push("-show-browser");

            const result = await mock.spawn("katana", katanaArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "katana" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-katana tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-katana");
        await harness.cleanup();
    });

    it("single target builds correct base args", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://example.com"],
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "katana");
        assert.deepEqual(mock.calls[0].args, ["-u", "https://example.com", "-silent"]);
        await harness.cleanup();
    });

    it("multiple targets are joined with comma", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://a.com", "https://b.com"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "https://a.com,https://b.com", "-silent"]);
        await harness.cleanup();
    });

    it("exclude patterns are joined and appended", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://example.com"],
            exclude: ["logout", "admin"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "https://example.com", "-silent", "-exclude", "logout,admin"]);
        await harness.cleanup();
    });

    it("depth is appended as string", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://example.com"],
            depth: 5,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "https://example.com", "-silent", "-d", "5"]);
        await harness.cleanup();
    });

    it("depth zero is still appended", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://example.com"],
            depth: 0,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "https://example.com", "-silent", "-d", "0"]);
        await harness.cleanup();
    });

    it("js_crawl appends -jc flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://example.com"],
            js_crawl: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-jc"));
        await harness.cleanup();
    });

    it("jsluice appends -jsl flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://example.com"],
            jsluice: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-jsl"));
        await harness.cleanup();
    });

    it("headers are each appended with -H prefix", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://example.com"],
            headers: ["Authorization: Bearer token", "X-Custom: value"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "-u", "https://example.com", "-silent",
            "-H", "Authorization: Bearer token",
            "-H", "X-Custom: value",
        ]);
        await harness.cleanup();
    });

    it("strategy appends correct value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://example.com"],
            strategy: "breadth-first",
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-strategy"));
        assert.ok(last?.args.includes("breadth-first"));
        await harness.cleanup();
    });

    it("headless and system_chrome and show_browser flags", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://example.com"],
            headless: true,
            system_chrome: true,
            show_browser: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-headless"));
        assert.ok(last?.args.includes("-system-chrome"));
        assert.ok(last?.args.includes("-show-browser"));
        await harness.cleanup();
    });

    it("all options combined build correct arg order", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://example.com"],
            exclude: ["logout"],
            depth: 3,
            js_crawl: true,
            jsluice: true,
            headers: ["Cookie: session=abc"],
            strategy: "depth-first",
            headless: true,
            system_chrome: true,
            show_browser: true,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "-u", "https://example.com", "-silent",
            "-exclude", "logout",
            "-d", "3",
            "-jc",
            "-jsl",
            "-H", "Cookie: session=abc",
            "-strategy", "depth-first",
            "-headless",
            "-system-chrome",
            "-show-browser",
        ]);
        await harness.cleanup();
    });

    it("rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-katana", {});
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "https://example.com/api\nhttps://example.com/login", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("katana-output");
        h.server.tool(
            "do-katana",
            "crawl",
            { target: z.array(z.string()) },
            async ({ target }) => {
                const result = await customMock.spawn("katana", ["-u", target.join(","), "-silent"]);
                return formatToolResult(result, { toolName: "katana" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-katana", {
            target: ["https://example.com"],
        });
        const text = getResultText(result);
        assert.ok(text.includes("https://example.com/api"));
        assert.ok(text.includes("https://example.com/login"));
        await h.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-katana", {
            target: ["https://example.com"],
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
