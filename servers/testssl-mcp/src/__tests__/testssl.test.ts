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

describe("testssl-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("testssl");

    // Shared runTestssl helper matching server implementation
    async function runTestssl(
        testsslArgs: string[],
        target?: string
    ): Promise<{ content: { type: "text"; text: string }[] }> {
        const finalArgs = ["--color", "0", ...testsslArgs];
        if (target) finalArgs.push(target);

        const result = await mock.spawn("testssl.sh", finalArgs);
        return formatToolResult(result, { toolName: "testssl", includeStderr: true, stripAnsi: true });
    }

    // Tool 1: do-testssl (full scan)
    harness.server.tool(
        "do-testssl",
        "Run a comprehensive TLS/SSL scan",
        {
            target: z.string().describe("Target host:port or URL"),
            sneaky: z.boolean().optional().describe("Use less conspicuous User-Agent"),
            quiet: z.boolean().optional().describe("Suppress output to stdout"),
        },
        async (params) => {
            const a: string[] = [];
            if (params.sneaky) a.push("--sneaky");
            if (params.quiet) a.push("-q");
            return runTestssl(a, params.target);
        }
    );

    // Tool 2: do-testssl-protocols
    harness.server.tool(
        "do-testssl-protocols",
        "Test TLS/SSL protocol versions",
        {
            target: z.string().describe("Target host:port or URL"),
            sneaky: z.boolean().optional().describe("Use less conspicuous User-Agent"),
        },
        async (params) => {
            const a: string[] = ["-p"];
            if (params.sneaky) a.push("--sneaky");
            return runTestssl(a, params.target);
        }
    );

    // Tool 3: do-testssl-vulnerabilities
    harness.server.tool(
        "do-testssl-vulnerabilities",
        "Test for TLS/SSL vulnerabilities",
        {
            target: z.string().describe("Target host:port or URL"),
            test_all: z.boolean().optional().describe("Test all vulnerabilities (-U)"),
            heartbleed: z.boolean().optional().describe("Test for Heartbleed (-H)"),
            poodle: z.boolean().optional().describe("Test for POODLE (-O)"),
        },
        async (params) => {
            const a: string[] = [];
            let hasVulnFlag = false;

            if (params.test_all) { a.push("-U"); hasVulnFlag = true; }
            if (params.heartbleed) { a.push("-H"); hasVulnFlag = true; }
            if (params.poodle) { a.push("-O"); hasVulnFlag = true; }

            // Default to all vulns if no specific flag set
            if (!hasVulnFlag) a.push("-U");

            return runTestssl(a, params.target);
        }
    );

    afterEach(() => mock.reset());

    // --- do-testssl tests ---

    it("registers the do-testssl tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-testssl");
        await harness.cleanup();
    });

    it("testssl: passes target with --color 0 prefix", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl", {
            target: "example.com:443",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "testssl.sh");
        assert.deepEqual(mock.calls[0].args, ["--color", "0", "example.com:443"]);
        await harness.cleanup();
    });

    it("testssl: appends connection options before target", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl", {
            target: "example.com:443",
            sneaky: true,
            quiet: true,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "--color", "0", "--sneaky", "-q", "example.com:443",
        ]);
        await harness.cleanup();
    });

    it("testssl: rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-testssl", {});
        await harness.cleanup();
    });

    // --- do-testssl-protocols tests ---

    it("registers the do-testssl-protocols tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-testssl-protocols");
        await harness.cleanup();
    });

    it("protocols: passes -p flag with --color 0 prefix", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-protocols", {
            target: "example.com:443",
        });
        assert.equal(mock.calls.length, 1);
        assert.deepEqual(mock.calls[0].args, ["--color", "0", "-p", "example.com:443"]);
        await harness.cleanup();
    });

    it("protocols: appends optional flags", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-protocols", {
            target: "example.com:443",
            sneaky: true,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "--color", "0", "-p", "--sneaky", "example.com:443",
        ]);
        await harness.cleanup();
    });

    // --- do-testssl-vulnerabilities tests ---

    it("registers the do-testssl-vulnerabilities tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-testssl-vulnerabilities");
        await harness.cleanup();
    });

    it("vulnerabilities: defaults to -U when no specific vuln flag is set", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-vulnerabilities", {
            target: "example.com:443",
        });
        assert.equal(mock.calls.length, 1);
        assert.deepEqual(mock.calls[0].args, ["--color", "0", "-U", "example.com:443"]);
        await harness.cleanup();
    });

    it("vulnerabilities: uses specific flags when provided", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-vulnerabilities", {
            target: "example.com:443",
            heartbleed: true,
            poodle: true,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "--color", "0", "-H", "-O", "example.com:443",
        ]);
        await harness.cleanup();
    });

    it("vulnerabilities: test_all flag uses -U", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-vulnerabilities", {
            target: "example.com:443",
            test_all: true,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["--color", "0", "-U", "example.com:443"]);
        await harness.cleanup();
    });

    // --- Output tests ---

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: {
                stdout: "Testing protocols via sockets\n TLS 1.3   yes\n TLS 1.2   yes\n TLS 1.1   no",
                stderr: "",
                exitCode: 0,
            },
        });
        const h = createTestServer("testssl-output");
        h.server.tool(
            "do-testssl",
            "Run testssl",
            { target: z.string() },
            async ({ target }) => {
                const result = await customMock.spawn("testssl.sh", ["--color", "0", target]);
                return formatToolResult(result, { toolName: "testssl", includeStderr: true, stripAnsi: true });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-testssl", {
            target: "example.com:443",
        });
        const text = getResultText(result);
        assert.ok(text.includes("TLS 1.3   yes"));
        assert.ok(text.includes("TLS 1.1   no"));
        await h.cleanup();
    });
});
