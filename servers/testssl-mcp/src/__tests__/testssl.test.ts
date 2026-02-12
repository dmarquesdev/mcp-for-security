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
import { formatToolResult, sanitizePath, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";
import type { SpawnOptions } from "mcp-shared";

describe("testssl-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("testssl");

    // Shared runTestssl helper matching server implementation
    async function runTestssl(
        testsslArgs: string[],
        target?: string,
        opts?: SpawnOptions,
    ): Promise<{ content: { type: "text"; text: string }[] }> {
        const finalArgs = ["--color", "0", ...testsslArgs];
        if (target) finalArgs.push(target);

        const result = await mock.spawn("testssl.sh", finalArgs, opts);
        return formatToolResult(result, { toolName: "testssl", includeStderr: true, stripAnsi: true });
    }

    // Shared addOutputArgs helper matching server implementation
    function addOutputArgs(a: string[], p: {
        quiet?: boolean; jsonfile?: string; csvfile?: string; htmlfile?: string; logfile?: string;
    }): void {
        const cwd = process.cwd();
        if (p.quiet) a.push("-q");
        if (p.jsonfile) a.push("--jsonfile", sanitizePath(p.jsonfile, cwd));
        if (p.csvfile) a.push("--csvfile", sanitizePath(p.csvfile, cwd));
        if (p.htmlfile) a.push("--htmlfile", sanitizePath(p.htmlfile, cwd));
        if (p.logfile) a.push("--logfile", sanitizePath(p.logfile, cwd));
    }

    // Tool 1: do-testssl (full scan)
    harness.server.tool(
        "do-testssl",
        "Run a comprehensive TLS/SSL scan",
        {
            target: z.string().describe("Target host:port or URL"),
            sneaky: z.boolean().optional().describe("Use less conspicuous User-Agent"),
            quiet: z.boolean().optional().describe("Suppress output to stdout"),
            jsonfile: z.string().optional().describe("JSON output file"),
            csvfile: z.string().optional().describe("CSV output file"),
            htmlfile: z.string().optional().describe("HTML output file"),
            logfile: z.string().optional().describe("Log file"),
            ...TIMEOUT_SCHEMA,
        },
        async (params, extra) => {
            const a: string[] = [];
            if (params.sneaky) a.push("--sneaky");
            addOutputArgs(a, params);
            return runTestssl(a, params.target, buildSpawnOptions(extra, { timeoutSeconds: params.timeoutSeconds }));
        }
    );

    // Tool 2: do-testssl-protocols
    harness.server.tool(
        "do-testssl-protocols",
        "Test TLS/SSL protocol versions",
        {
            target: z.string().describe("Target host:port or URL"),
            sneaky: z.boolean().optional().describe("Use less conspicuous User-Agent"),
            ...TIMEOUT_SCHEMA,
        },
        async (params, extra) => {
            const a: string[] = ["-p"];
            if (params.sneaky) a.push("--sneaky");
            return runTestssl(a, params.target, buildSpawnOptions(extra, { timeoutSeconds: params.timeoutSeconds }));
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
            ...TIMEOUT_SCHEMA,
        },
        async (params, extra) => {
            const a: string[] = [];
            let hasVulnFlag = false;

            if (params.test_all) { a.push("-U"); hasVulnFlag = true; }
            if (params.heartbleed) { a.push("-H"); hasVulnFlag = true; }
            if (params.poodle) { a.push("-O"); hasVulnFlag = true; }

            // Default to all vulns if no specific flag set
            if (!hasVulnFlag) a.push("-U");

            return runTestssl(a, params.target, buildSpawnOptions(extra, { timeoutSeconds: params.timeoutSeconds }));
        }
    );

    // Tool 4: do-testssl-ciphers
    harness.server.tool(
        "do-testssl-ciphers",
        "Analyze cipher suites",
        {
            target: z.string().describe("Target host:port or URL"),
            test_mode: z.enum(["standard", "each-cipher", "cipher-per-proto", "forward-secrecy", "server-preference"]).describe("Cipher test mode"),
            cipher_pattern: z.string().optional().describe("Cipher pattern filter"),
            show_each: z.boolean().optional().describe("Show each cipher tested"),
            ...TIMEOUT_SCHEMA,
        },
        async (params, extra) => {
            const modeMap: Record<string, string> = {
                "standard": "-s",
                "each-cipher": "-e",
                "cipher-per-proto": "-E",
                "forward-secrecy": "-f",
                "server-preference": "-P",
            };
            const a: string[] = [modeMap[params.test_mode]];
            if (params.cipher_pattern) a.push("-x", params.cipher_pattern);
            if (params.show_each) a.push("--show-each");
            return runTestssl(a, params.target, buildSpawnOptions(extra, { timeoutSeconds: params.timeoutSeconds }));
        }
    );

    // Tool 5: do-testssl-server-info
    harness.server.tool(
        "do-testssl-server-info",
        "Server defaults, certs, headers",
        {
            target: z.string().describe("Target host:port or URL"),
            server_defaults: z.boolean().optional().describe("Show server defaults (-S)"),
            headers: z.boolean().optional().describe("Test HTTP headers (-h)"),
            client_simulation: z.boolean().optional().describe("Client simulation (-c)"),
            grease: z.boolean().optional().describe("GREASE testing (-g)"),
            ...TIMEOUT_SCHEMA,
        },
        async (params, extra) => {
            const a: string[] = [];
            let hasTestFlag = false;
            if (params.server_defaults) { a.push("-S"); hasTestFlag = true; }
            if (params.headers) { a.push("-h"); hasTestFlag = true; }
            if (params.client_simulation) { a.push("-c"); hasTestFlag = true; }
            if (params.grease) { a.push("-g"); hasTestFlag = true; }
            if (!hasTestFlag) a.push("-S", "-h");
            return runTestssl(a, params.target, buildSpawnOptions(extra, { timeoutSeconds: params.timeoutSeconds }));
        }
    );

    // Tool 6: do-testssl-mass-scan (validates path via sanitizePath)
    harness.server.tool(
        "do-testssl-mass-scan",
        "Batch scan from file",
        {
            file_path: z.string().describe("File with targets"),
            mode: z.enum(["serial", "parallel"]).optional().describe("Execution mode"),
            ...TIMEOUT_SCHEMA,
        },
        async (params, extra) => {
            const safeFilePath = sanitizePath(params.file_path, process.cwd());
            const a: string[] = ["--file", safeFilePath, "--warnings", "batch"];
            if (params.mode === "serial") a.push("--serial");
            if (params.mode === "parallel") a.push("--parallel");
            return runTestssl(a, undefined, buildSpawnOptions(extra, { timeoutSeconds: params.timeoutSeconds }));
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

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl", {
            target: "example.com:443",
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });

    // --- do-testssl-ciphers tests ---

    it("registers the do-testssl-ciphers tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-testssl-ciphers");
        await harness.cleanup();
    });

    it("ciphers: maps standard mode to -s flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-ciphers", {
            target: "example.com:443",
            test_mode: "standard",
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["--color", "0", "-s", "example.com:443"]);
        await harness.cleanup();
    });

    it("ciphers: maps each-cipher mode to -e flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-ciphers", {
            target: "example.com:443",
            test_mode: "each-cipher",
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-e"), "should contain -e flag");
        await harness.cleanup();
    });

    it("ciphers: maps forward-secrecy mode to -f flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-ciphers", {
            target: "example.com:443",
            test_mode: "forward-secrecy",
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-f"), "should contain -f flag");
        await harness.cleanup();
    });

    it("ciphers: appends cipher_pattern with -x flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-ciphers", {
            target: "example.com:443",
            test_mode: "standard",
            cipher_pattern: "AES256",
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-x"), "should contain -x flag");
        assert.ok(last?.args.includes("AES256"), "should contain cipher pattern");
        await harness.cleanup();
    });

    it("ciphers: appends --show-each when enabled", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-ciphers", {
            target: "example.com:443",
            test_mode: "standard",
            show_each: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--show-each"), "should contain --show-each flag");
        await harness.cleanup();
    });

    it("ciphers: rejects invalid test_mode", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-testssl-ciphers", {
            target: "example.com:443",
            test_mode: "invalid-mode",
        });
        await harness.cleanup();
    });

    // --- do-testssl-server-info tests ---

    it("registers the do-testssl-server-info tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-testssl-server-info");
        await harness.cleanup();
    });

    it("server-info: defaults to -S -h when no flags set", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-server-info", {
            target: "example.com:443",
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["--color", "0", "-S", "-h", "example.com:443"]);
        await harness.cleanup();
    });

    it("server-info: uses specific flags when provided", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-server-info", {
            target: "example.com:443",
            server_defaults: true,
            client_simulation: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-S"), "should contain -S flag");
        assert.ok(last?.args.includes("-c"), "should contain -c flag");
        assert.ok(!last?.args.includes("-h"), "should not contain default -h flag");
        await harness.cleanup();
    });

    it("server-info: passes grease flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-server-info", {
            target: "example.com:443",
            grease: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("-g"), "should contain -g flag");
        await harness.cleanup();
    });

    // --- do-testssl-mass-scan tests ---

    it("registers the do-testssl-mass-scan tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-testssl-mass-scan");
        await harness.cleanup();
    });

    it("mass-scan: passes --file with validated path and --warnings batch", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-mass-scan", {
            file_path: "targets.txt",
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--file"), "should contain --file flag");
        assert.ok(last?.args.includes("--warnings"), "should contain --warnings flag");
        assert.ok(last?.args.includes("batch"), "should default to batch warnings");
        await harness.cleanup();
    });

    it("mass-scan: passes --serial for serial mode", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-mass-scan", {
            file_path: "targets.txt",
            mode: "serial",
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--serial"), "should contain --serial flag");
        await harness.cleanup();
    });

    it("mass-scan: passes --parallel for parallel mode", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl-mass-scan", {
            file_path: "targets.txt",
            mode: "parallel",
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--parallel"), "should contain --parallel flag");
        await harness.cleanup();
    });

    it("mass-scan: rejects path traversal in file_path", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-testssl-mass-scan", {
            file_path: "../../etc/passwd",
        });
        await harness.cleanup();
    });

    it("mass-scan: rejects absolute path outside cwd", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-testssl-mass-scan", {
            file_path: "/etc/shadow",
        });
        await harness.cleanup();
    });

    // --- Path traversal: output file sanitization ---

    it("output file: rejects path traversal in jsonfile", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-testssl", {
            target: "example.com:443",
            jsonfile: "../../etc/cron.d/evil",
        });
        await harness.cleanup();
    });

    it("output file: rejects path traversal in htmlfile", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-testssl", {
            target: "example.com:443",
            htmlfile: "/tmp/../../etc/shadow",
        });
        await harness.cleanup();
    });

    it("output file: accepts safe relative path for logfile", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-testssl", {
            target: "example.com:443",
            logfile: "output/scan.log",
        });
        const last = mock.lastCall();
        const logIdx = last?.args.indexOf("--logfile");
        assert.ok(logIdx !== undefined && logIdx >= 0, "should contain --logfile flag");
        await harness.cleanup();
    });
});
