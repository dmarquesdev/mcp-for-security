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

describe("dalfox-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("dalfox");

    harness.server.tool(
        "do-dalfox",
        "Scan target URL for XSS vulnerabilities",
        {
            url: z.string().describe("Target URL"),
            headers: z.array(z.string()).optional().describe("Custom headers"),
            cookie: z.string().optional().describe("Cookie string"),
            method: z.string().optional().describe("HTTP method"),
            data: z.string().optional().describe("POST data"),
            blind: z.string().optional().describe("Blind XSS callback URL"),
            worker: z.number().optional().describe("Concurrent workers"),
            delay: z.number().optional().describe("Delay between requests"),
            param: z.array(z.string()).optional().describe("Specific params to test"),
            format: z.enum(["plain", "json", "jsonl"]).optional().describe("Output format"),
            follow_redirects: z.boolean().optional().describe("Follow redirects"),
            only_discovery: z.boolean().optional().describe("Parameter analysis only"),
            deep_domxss: z.boolean().optional().describe("Enhanced DOM XSS testing"),
            user_agent: z.string().optional().describe("Custom User-Agent"),
            proxy: z.string().optional().describe("Proxy URL"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ url, headers, cookie, method, data, blind, worker, delay, param, format, follow_redirects, only_discovery, deep_domxss, user_agent, proxy, timeoutSeconds }, extra) => {
            const dalfoxArgs = ["url", url];
            if (headers) {
                for (const h of headers) dalfoxArgs.push("-H", h);
            }
            if (cookie) dalfoxArgs.push("-C", cookie);
            if (method) dalfoxArgs.push("-X", method);
            if (data) dalfoxArgs.push("-d", data);
            if (blind) dalfoxArgs.push("-b", blind);
            if (worker !== undefined) dalfoxArgs.push("-w", String(worker));
            if (delay !== undefined) dalfoxArgs.push("--delay", String(delay));
            if (param) {
                for (const p of param) dalfoxArgs.push("-p", p);
            }
            if (format) dalfoxArgs.push("--format", format);
            if (follow_redirects) dalfoxArgs.push("-F");
            if (only_discovery) dalfoxArgs.push("--only-discovery");
            if (deep_domxss) dalfoxArgs.push("--deep-domxss");
            if (user_agent) dalfoxArgs.push("--user-agent", user_agent);
            if (proxy) dalfoxArgs.push("--proxy", proxy);

            const result = await mock.spawn("dalfox", dalfoxArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "dalfox" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-dalfox tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-dalfox");
        await harness.cleanup();
    });

    it("passes URL to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-dalfox", {
            url: "http://example.com/?q=test",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "dalfox");
        assert.deepEqual(mock.calls[0].args, ["url", "http://example.com/?q=test"]);
        await harness.cleanup();
    });

    it("passes headers and cookie flags", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-dalfox", {
            url: "http://example.com/?q=test",
            headers: ["Authorization: Bearer token", "X-Custom: value"],
            cookie: "session=abc123",
        });
        const callArgs = mock.calls[0].args;
        assert.ok(callArgs.includes("-H"));
        assert.ok(callArgs.includes("Authorization: Bearer token"));
        assert.ok(callArgs.includes("X-Custom: value"));
        assert.ok(callArgs.includes("-C"));
        assert.ok(callArgs.includes("session=abc123"));
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        mock.reset();
        const customMock = createMockSpawn({
            defaultResult: { stdout: "[POC][V][GET] http://example.com/?q=test payload: <script>alert(1)</script>", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("dalfox-output");
        h.server.tool(
            "do-dalfox",
            "Scan for XSS",
            {
                url: z.string(),
            },
            async ({ url }) => {
                const result = await customMock.spawn("dalfox", ["url", url]);
                return formatToolResult(result, { toolName: "dalfox" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-dalfox", {
            url: "http://example.com/?q=test",
        });
        const text = getResultText(result);
        assert.ok(text.includes("POC"));
        assert.ok(text.includes("example.com"));
        await h.cleanup();
    });

    it("handles optional params (method, blind, worker)", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-dalfox", {
            url: "http://example.com/?q=test",
            method: "POST",
            blind: "https://callback.example.com",
            worker: 10,
        });
        const callArgs = mock.calls[0].args;
        assert.ok(callArgs.includes("-X"));
        assert.ok(callArgs.includes("POST"));
        assert.ok(callArgs.includes("-b"));
        assert.ok(callArgs.includes("https://callback.example.com"));
        assert.ok(callArgs.includes("-w"));
        assert.ok(callArgs.includes("10"));
        await harness.cleanup();
    });

    it("rejects when URL is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-dalfox", {});
        await harness.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-dalfox", {
            url: "http://example.com/?q=test",
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });

    it("maps boolean flags correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-dalfox", {
            url: "http://example.com/?q=test",
            follow_redirects: true,
            only_discovery: true,
            deep_domxss: true,
        });
        const callArgs = mock.calls[0].args;
        assert.ok(callArgs.includes("-F"));
        assert.ok(callArgs.includes("--only-discovery"));
        assert.ok(callArgs.includes("--deep-domxss"));
        await harness.cleanup();
    });
});
