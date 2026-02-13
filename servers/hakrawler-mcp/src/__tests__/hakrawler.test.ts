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

describe("hakrawler-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("hakrawler");

    harness.server.tool(
        "do-hakrawler",
        "Crawls web pages to discover endpoints",
        {
            urls: z.array(z.string()),
            depth: z.number().optional(),
            disable_redirects: z.boolean().optional(),
            headers: z.string().optional(),
            inside_path: z.boolean().optional(),
            insecure: z.boolean().optional(),
            json: z.boolean().optional(),
            proxy: z.string().optional(),
            show_source: z.boolean().optional(),
            page_size_limit: z.number().optional(),
            include_subs: z.boolean().optional(),
            threads: z.number().optional(),
            url_timeout: z.number().optional(),
            unique: z.boolean().optional(),
            show_where: z.boolean().optional(),
            ...TIMEOUT_SCHEMA,
        },
        async ({ urls, depth, disable_redirects, headers, inside_path, insecure, json, proxy, show_source, page_size_limit, include_subs, threads, url_timeout, unique, show_where, timeoutSeconds }, extra) => {
            const hakrawlerArgs: string[] = [];

            if (depth !== undefined) hakrawlerArgs.push("-d", depth.toString());
            if (disable_redirects) hakrawlerArgs.push("-dr");
            if (headers) hakrawlerArgs.push("-h", headers);
            if (inside_path) hakrawlerArgs.push("-i");
            if (insecure) hakrawlerArgs.push("-insecure");
            if (json) hakrawlerArgs.push("-json");
            if (proxy) hakrawlerArgs.push("-proxy", proxy);
            if (show_source) hakrawlerArgs.push("-s");
            if (page_size_limit !== undefined) hakrawlerArgs.push("-size", page_size_limit.toString());
            if (include_subs) hakrawlerArgs.push("-subs");
            if (threads !== undefined) hakrawlerArgs.push("-t", threads.toString());
            if (url_timeout !== undefined) hakrawlerArgs.push("-timeout", url_timeout.toString());
            if (unique) hakrawlerArgs.push("-u");
            if (show_where) hakrawlerArgs.push("-w");

            const stdinData = urls.join("\n") + "\n";
            const result = await mock.spawn("hakrawler", hakrawlerArgs, buildSpawnOptions(extra, { timeoutSeconds, stdinData }));
            return formatToolResult(result, { toolName: "hakrawler" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-hakrawler tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-hakrawler");
        await harness.cleanup();
    });

    it("single URL passes stdinData with trailing newline", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, []);
        assert.equal(last?.options?.stdinData, "https://example.com\n");
        await harness.cleanup();
    });

    it("multiple URLs are newline-joined in stdinData", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://a.com", "https://b.com", "https://c.com"],
        });
        const last = mock.lastCall();
        assert.equal(last?.options?.stdinData, "https://a.com\nhttps://b.com\nhttps://c.com\n");
        await harness.cleanup();
    });

    it("depth flag is appended", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            depth: 5,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-d", "5"]);
        await harness.cleanup();
    });

    it("disable_redirects appends -dr flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            disable_redirects: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-dr"));
        await harness.cleanup();
    });

    it("headers appends -h with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            headers: "Auth: Bearer token;;X-Custom: val",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-h", "Auth: Bearer token;;X-Custom: val"]);
        await harness.cleanup();
    });

    it("inside_path appends -i flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            inside_path: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-i"));
        await harness.cleanup();
    });

    it("insecure appends -insecure flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            insecure: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-insecure"));
        await harness.cleanup();
    });

    it("json appends -json flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            json: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-json"));
        await harness.cleanup();
    });

    it("proxy appends -proxy with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            proxy: "http://127.0.0.1:8080",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-proxy", "http://127.0.0.1:8080"]);
        await harness.cleanup();
    });

    it("show_source appends -s flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            show_source: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-s"));
        await harness.cleanup();
    });

    it("page_size_limit appends -size with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            page_size_limit: 1024,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-size", "1024"]);
        await harness.cleanup();
    });

    it("include_subs appends -subs flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            include_subs: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-subs"));
        await harness.cleanup();
    });

    it("threads appends -t with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            threads: 16,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-t", "16"]);
        await harness.cleanup();
    });

    it("url_timeout appends -timeout with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            url_timeout: 30,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-timeout", "30"]);
        await harness.cleanup();
    });

    it("unique appends -u flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            unique: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-u"));
        await harness.cleanup();
    });

    it("show_where appends -w flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            show_where: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-w"));
        await harness.cleanup();
    });

    it("all flags combined build correct args", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            depth: 3,
            disable_redirects: true,
            headers: "Cookie: session=abc",
            inside_path: true,
            insecure: true,
            json: true,
            proxy: "http://proxy:8080",
            show_source: true,
            page_size_limit: 512,
            include_subs: true,
            threads: 4,
            url_timeout: 10,
            unique: true,
            show_where: true,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, [
            "-d", "3",
            "-dr",
            "-h", "Cookie: session=abc",
            "-i",
            "-insecure",
            "-json",
            "-proxy", "http://proxy:8080",
            "-s",
            "-size", "512",
            "-subs",
            "-t", "4",
            "-timeout", "10",
            "-u",
            "-w",
        ]);
        assert.equal(last?.options?.stdinData, "https://example.com\n");
        await harness.cleanup();
    });

    it("rejects when urls is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-hakrawler", {});
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: {
                stdout: "https://example.com/api\nhttps://example.com/login\nhttps://example.com/js/app.js",
                stderr: "",
                exitCode: 0,
            },
        });
        const h = createTestServer("hakrawler-output");
        h.server.tool(
            "do-hakrawler",
            "crawl",
            { urls: z.array(z.string()) },
            async ({ urls }) => {
                const stdinData = urls.join("\n") + "\n";
                const result = await customMock.spawn("hakrawler", [], { stdinData });
                return formatToolResult(result, { toolName: "hakrawler" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-hakrawler", {
            urls: ["https://example.com"],
        });
        const text = getResultText(result);
        assert.ok(text.includes("https://example.com/api"));
        assert.ok(text.includes("https://example.com/login"));
        assert.ok(text.includes("https://example.com/js/app.js"));
        await h.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-hakrawler", {
            urls: ["https://example.com"],
            timeoutSeconds: 120,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 120000);
        await harness.cleanup();
    });
});
