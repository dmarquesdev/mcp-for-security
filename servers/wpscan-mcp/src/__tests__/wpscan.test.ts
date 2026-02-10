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

describe("wpscan-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("wpscan");

    harness.server.tool(
        "do-wpscan",
        "Run wpscan to analyze WordPress websites for security issues",
        {
            url: z.string().url(),
            detection_mode: z.enum(["mixed", "passive", "aggressive"]).optional(),
            random_user_agent: z.boolean().optional(),
            max_threads: z.number().optional(),
            disable_tls_checks: z.boolean().optional(),
            proxy: z.string().optional(),
            cookies: z.string().optional(),
            force: z.boolean().optional(),
            enumerate: z.array(z.enum(["vp", "ap", "p", "vt", "at", "t", "tt", "cb", "dbe"])),
        },
        async ({ url, detection_mode, random_user_agent, max_threads, disable_tls_checks, proxy, cookies, force, enumerate }) => {
            const wpscanArgs = ["-u", url];
            if (detection_mode) wpscanArgs.push("--detection-mode", detection_mode);
            if (random_user_agent) wpscanArgs.push("--random-user-agent");
            if (max_threads) wpscanArgs.push("-t", max_threads.toString());
            if (disable_tls_checks) wpscanArgs.push("--disable-tls-checks");
            if (proxy) wpscanArgs.push("--proxy", proxy);
            if (cookies) wpscanArgs.push("--cookie-string", cookies);
            if (force) wpscanArgs.push("--force");
            if (enumerate && enumerate.length > 0) wpscanArgs.push("-e", enumerate.join(","));

            const result = await mock.spawn("wpscan", wpscanArgs);
            return formatToolResult(result, { toolName: "wpscan", includeStderr: true });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-wpscan tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-wpscan");
        await harness.cleanup();
    });

    it("minimal call with url and enumerate builds correct args", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-wpscan", {
            url: "https://example.com",
            enumerate: ["vp"],
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "wpscan");
        assert.deepEqual(mock.calls[0].args, ["-u", "https://example.com", "-e", "vp"]);
        await harness.cleanup();
    });

    it("detection_mode appends --detection-mode flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-wpscan", {
            url: "https://example.com",
            detection_mode: "aggressive",
            enumerate: ["vp"],
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--detection-mode"));
        assert.ok(last?.args.includes("aggressive"));
        await harness.cleanup();
    });

    it("random_user_agent appends --random-user-agent flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-wpscan", {
            url: "https://example.com",
            random_user_agent: true,
            enumerate: ["vp"],
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--random-user-agent"));
        await harness.cleanup();
    });

    it("max_threads appends -t flag with string value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-wpscan", {
            url: "https://example.com",
            max_threads: 10,
            enumerate: ["vp"],
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-t"));
        assert.ok(last?.args.includes("10"));
        await harness.cleanup();
    });

    it("disable_tls_checks appends --disable-tls-checks", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-wpscan", {
            url: "https://example.com",
            disable_tls_checks: true,
            enumerate: ["vp"],
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--disable-tls-checks"));
        await harness.cleanup();
    });

    it("proxy appends --proxy flag with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-wpscan", {
            url: "https://example.com",
            proxy: "http://127.0.0.1:8080",
            enumerate: ["vp"],
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--proxy"));
        assert.ok(last?.args.includes("http://127.0.0.1:8080"));
        await harness.cleanup();
    });

    it("cookies appends --cookie-string flag with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-wpscan", {
            url: "https://example.com",
            cookies: "session=abc123; token=xyz",
            enumerate: ["vp"],
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--cookie-string"));
        assert.ok(last?.args.includes("session=abc123; token=xyz"));
        await harness.cleanup();
    });

    it("force appends --force flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-wpscan", {
            url: "https://example.com",
            force: true,
            enumerate: ["vp"],
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--force"));
        await harness.cleanup();
    });

    it("multiple enumerate options are joined with comma", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-wpscan", {
            url: "https://example.com",
            enumerate: ["vp", "ap", "cb", "dbe"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "https://example.com", "-e", "vp,ap,cb,dbe"]);
        await harness.cleanup();
    });

    it("all options combined build correct arg order", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-wpscan", {
            url: "https://example.com",
            detection_mode: "passive",
            random_user_agent: true,
            max_threads: 8,
            disable_tls_checks: true,
            proxy: "http://proxy:8080",
            cookies: "sess=abc",
            force: true,
            enumerate: ["vp", "t"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "-u", "https://example.com",
            "--detection-mode", "passive",
            "--random-user-agent",
            "-t", "8",
            "--disable-tls-checks",
            "--proxy", "http://proxy:8080",
            "--cookie-string", "sess=abc",
            "--force",
            "-e", "vp,t",
        ]);
        await harness.cleanup();
    });

    it("rejects when url is not a valid URL", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-wpscan", {
            url: "not-a-url",
            enumerate: ["vp"],
        });
        await harness.cleanup();
    });

    it("rejects when enumerate is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-wpscan", {
            url: "https://example.com",
        });
        await harness.cleanup();
    });

    it("rejects when url is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-wpscan", {
            enumerate: ["vp"],
        });
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: {
                stdout: "[+] WordPress version 6.4.2\n[!] 3 vulnerabilities found",
                stderr: "",
                exitCode: 0,
            },
        });
        const h = createTestServer("wpscan-output");
        h.server.tool(
            "do-wpscan",
            "scan",
            {
                url: z.string().url(),
                enumerate: z.array(z.enum(["vp", "ap", "p", "vt", "at", "t", "tt", "cb", "dbe"])),
            },
            async ({ url, enumerate }) => {
                const result = await customMock.spawn("wpscan", ["-u", url, "-e", enumerate.join(",")]);
                return formatToolResult(result, { toolName: "wpscan", includeStderr: true });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-wpscan", {
            url: "https://example.com",
            enumerate: ["vp"],
        });
        const text = getResultText(result);
        assert.ok(text.includes("WordPress version 6.4.2"));
        assert.ok(text.includes("3 vulnerabilities found"));
        await h.cleanup();
    });
});
