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

describe("gau-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("gau");

    harness.server.tool(
        "do-gau",
        "Fetches known URLs for domains",
        {
            targets: z.array(z.string()),
            providers: z.array(z.string()).optional(),
            blacklist: z.array(z.string()).optional(),
            include_subs: z.boolean().optional(),
            json: z.boolean().optional(),
            match_status_codes: z.string().optional(),
            filter_status_codes: z.string().optional(),
            match_mime_types: z.string().optional(),
            filter_mime_types: z.string().optional(),
            from: z.string().optional(),
            to: z.string().optional(),
            remove_duplicates: z.boolean().optional(),
            threads: z.number().optional(),
            proxy: z.string().optional(),
            retries: z.number().optional(),
            request_timeout: z.number().optional(),
            verbose: z.boolean().optional(),
            ...TIMEOUT_SCHEMA,
        },
        async ({ targets, providers, blacklist, include_subs, json, match_status_codes, filter_status_codes, match_mime_types, filter_mime_types, from, to, remove_duplicates, threads, proxy, retries, request_timeout, verbose, timeoutSeconds }, extra) => {
            const gauArgs: string[] = [];

            if (providers && providers.length > 0) gauArgs.push("--providers", providers.join(","));
            if (blacklist && blacklist.length > 0) gauArgs.push("--blacklist", blacklist.join(","));
            if (include_subs) gauArgs.push("--subs");
            if (json) gauArgs.push("--json");
            if (match_status_codes) gauArgs.push("--mc", match_status_codes);
            if (filter_status_codes) gauArgs.push("--fc", filter_status_codes);
            if (match_mime_types) gauArgs.push("--mt", match_mime_types);
            if (filter_mime_types) gauArgs.push("--ft", filter_mime_types);
            if (from) gauArgs.push("--from", from);
            if (to) gauArgs.push("--to", to);
            if (remove_duplicates) gauArgs.push("--fp");
            if (threads !== undefined) gauArgs.push("--threads", threads.toString());
            if (proxy) gauArgs.push("--proxy", proxy);
            if (retries !== undefined) gauArgs.push("--retries", retries.toString());
            if (request_timeout !== undefined) gauArgs.push("--timeout", request_timeout.toString());
            if (verbose) gauArgs.push("--verbose");

            gauArgs.push(...targets);

            const result = await mock.spawn("gau", gauArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "gau" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-gau tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-gau");
        await harness.cleanup();
    });

    it("single target is passed as positional arg", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["example.com"]);
        await harness.cleanup();
    });

    it("multiple targets are all appended at end", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com", "test.com", "other.org"],
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["example.com", "test.com", "other.org"]);
        await harness.cleanup();
    });

    it("providers are comma-joined with --providers flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            providers: ["wayback", "otx"],
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--providers", "wayback,otx", "example.com"]);
        await harness.cleanup();
    });

    it("blacklist is comma-joined with --blacklist flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            blacklist: ["jpg", "png", "gif"],
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--blacklist", "jpg,png,gif", "example.com"]);
        await harness.cleanup();
    });

    it("include_subs appends --subs flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            include_subs: true,
        });
        assert.ok(mock.lastCall()?.args.includes("--subs"));
        await harness.cleanup();
    });

    it("json appends --json flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            json: true,
        });
        assert.ok(mock.lastCall()?.args.includes("--json"));
        await harness.cleanup();
    });

    it("remove_duplicates appends --fp flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            remove_duplicates: true,
        });
        assert.ok(mock.lastCall()?.args.includes("--fp"));
        await harness.cleanup();
    });

    it("verbose appends --verbose flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            verbose: true,
        });
        assert.ok(mock.lastCall()?.args.includes("--verbose"));
        await harness.cleanup();
    });

    it("match_status_codes appends --mc with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            match_status_codes: "200,301",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--mc", "200,301", "example.com"]);
        await harness.cleanup();
    });

    it("filter_status_codes appends --fc with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            filter_status_codes: "404,500",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--fc", "404,500", "example.com"]);
        await harness.cleanup();
    });

    it("match_mime_types appends --mt with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            match_mime_types: "text/html",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--mt", "text/html", "example.com"]);
        await harness.cleanup();
    });

    it("filter_mime_types appends --ft with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            filter_mime_types: "image/jpeg",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--ft", "image/jpeg", "example.com"]);
        await harness.cleanup();
    });

    it("from appends --from with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            from: "202301",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--from", "202301", "example.com"]);
        await harness.cleanup();
    });

    it("to appends --to with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            to: "202312",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--to", "202312", "example.com"]);
        await harness.cleanup();
    });

    it("proxy appends --proxy with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            proxy: "http://127.0.0.1:8080",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--proxy", "http://127.0.0.1:8080", "example.com"]);
        await harness.cleanup();
    });

    it("threads appends --threads with value as string", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            threads: 10,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--threads", "10", "example.com"]);
        await harness.cleanup();
    });

    it("retries appends --retries with value as string", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            retries: 3,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--retries", "3", "example.com"]);
        await harness.cleanup();
    });

    it("request_timeout maps to --timeout with value as string", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            request_timeout: 45,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["--timeout", "45", "example.com"]);
        await harness.cleanup();
    });

    it("all flags combined build correct args with targets last", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com", "test.com"],
            providers: ["wayback", "commoncrawl"],
            blacklist: ["jpg", "png"],
            include_subs: true,
            json: true,
            match_status_codes: "200",
            filter_status_codes: "404",
            match_mime_types: "text/html",
            filter_mime_types: "image/jpeg",
            from: "202301",
            to: "202312",
            remove_duplicates: true,
            threads: 5,
            proxy: "http://proxy:8080",
            retries: 2,
            request_timeout: 30,
            verbose: true,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, [
            "--providers", "wayback,commoncrawl",
            "--blacklist", "jpg,png",
            "--subs",
            "--json",
            "--mc", "200",
            "--fc", "404",
            "--mt", "text/html",
            "--ft", "image/jpeg",
            "--from", "202301",
            "--to", "202312",
            "--fp",
            "--threads", "5",
            "--proxy", "http://proxy:8080",
            "--retries", "2",
            "--timeout", "30",
            "--verbose",
            "example.com",
            "test.com",
        ]);
        await harness.cleanup();
    });

    it("rejects when targets is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-gau", {});
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
        const h = createTestServer("gau-output");
        h.server.tool(
            "do-gau",
            "fetch URLs",
            { targets: z.array(z.string()) },
            async ({ targets }) => {
                const result = await customMock.spawn("gau", [...targets], {});
                return formatToolResult(result, { toolName: "gau" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-gau", {
            targets: ["example.com"],
        });
        const text = getResultText(result);
        assert.ok(text.includes("https://example.com/api"));
        assert.ok(text.includes("https://example.com/login"));
        assert.ok(text.includes("https://example.com/js/app.js"));
        await h.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gau", {
            targets: ["example.com"],
            timeoutSeconds: 120,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 120000);
        await harness.cleanup();
    });
});
