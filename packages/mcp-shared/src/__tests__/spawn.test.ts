import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { secureSpawn } from "../spawn.js";

describe("secureSpawn", () => {
    it("captures stdout from echo", async () => {
        const result = await secureSpawn("echo", ["hello world"]);
        assert.equal(result.exitCode, 0);
        assert.equal(result.stdout.trim(), "hello world");
        assert.equal(result.stderr, "");
    });

    it("captures stderr from a node script", async () => {
        const result = await secureSpawn("node", [
            "-e",
            'process.stderr.write("err output")',
        ]);
        assert.equal(result.exitCode, 0);
        assert.equal(result.stderr, "err output");
    });

    it("returns nonzero exit code on failure", async () => {
        const result = await secureSpawn("node", ["-e", "process.exit(42)"]);
        assert.equal(result.exitCode, 42);
    });

    it("returns exit code 0 on success", async () => {
        const result = await secureSpawn("node", ["-e", "process.exit(0)"]);
        assert.equal(result.exitCode, 0);
    });

    it("rejects on timeout", async () => {
        await assert.rejects(
            () =>
                secureSpawn("sleep", ["10"], {
                    timeoutMs: 100,
                }),
            /timed out/
        );
    });

    it("rejects when output exceeds buffer limit", async () => {
        // Generate ~200 bytes of output with a 100-byte limit
        await assert.rejects(
            () =>
                secureSpawn(
                    "node",
                    ["-e", 'process.stdout.write("x".repeat(200))'],
                    { maxOutputBytes: 100 }
                ),
            /exceeded.*100 bytes/
        );
    });

    it("respects cwd option", async () => {
        const result = await secureSpawn("pwd", [], { cwd: "/tmp" });
        assert.equal(result.exitCode, 0);
        // /tmp may resolve to /private/tmp on macOS
        assert.ok(
            result.stdout.trim().endsWith("/tmp"),
            `Expected cwd /tmp but got: ${result.stdout.trim()}`
        );
    });

    it("passes env option to child process", async () => {
        const result = await secureSpawn(
            "node",
            ["-e", "process.stdout.write(process.env.TEST_VAR || 'unset')"],
            { env: { ...process.env, TEST_VAR: "hello123" } }
        );
        assert.equal(result.stdout, "hello123");
    });

    it("rejects on nonexistent binary", async () => {
        await assert.rejects(
            () => secureSpawn("nonexistent-binary-abc123", []),
            /Failed to start process/
        );
    });

    it("rejects immediately when signal is already aborted", async () => {
        const ac = new AbortController();
        ac.abort();
        await assert.rejects(
            () => secureSpawn("echo", ["hello"], { signal: ac.signal }),
            /Aborted/
        );
    });

    it("rejects when signal is aborted mid-execution", async () => {
        const ac = new AbortController();
        setTimeout(() => ac.abort(), 50);
        await assert.rejects(
            () =>
                secureSpawn("sleep", ["10"], { signal: ac.signal }),
            /Aborted/
        );
    });

    it("completes normally when signal is not aborted", async () => {
        const ac = new AbortController();
        const result = await secureSpawn("echo", ["still alive"], {
            signal: ac.signal,
        });
        assert.equal(result.exitCode, 0);
        assert.equal(result.stdout.trim(), "still alive");
    });

    it("timeout still works when signal is also provided", async () => {
        const ac = new AbortController();
        await assert.rejects(
            () =>
                secureSpawn("sleep", ["10"], {
                    timeoutMs: 100,
                    signal: ac.signal,
                }),
            /timed out/
        );
    });

    it("writes stdinData to child process stdin", async () => {
        const result = await secureSpawn(
            "node",
            ["-e", "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(d))"],
            { stdinData: "hello from stdin" }
        );
        assert.equal(result.exitCode, 0);
        assert.equal(result.stdout, "hello from stdin");
    });

    it("writes multiline stdinData (newline-delimited)", async () => {
        const result = await secureSpawn(
            "node",
            ["-e", "let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>process.stdout.write(d))"],
            { stdinData: "https://a.com\nhttps://b.com\n" }
        );
        assert.equal(result.exitCode, 0);
        assert.equal(result.stdout, "https://a.com\nhttps://b.com\n");
    });

    it("stdinData still respects timeout", async () => {
        await assert.rejects(
            () =>
                secureSpawn("sleep", ["10"], {
                    stdinData: "data",
                    timeoutMs: 100,
                }),
            /timed out/
        );
    });
});
