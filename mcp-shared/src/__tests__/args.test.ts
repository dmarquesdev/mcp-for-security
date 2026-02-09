import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { secureSpawn } from "../spawn.js";
import { writeFileSync, unlinkSync } from "fs";
import { join } from "path";

const BUILD_DIR = join(__dirname, "..", "..", "build");

/**
 * Run getToolArgs in a subprocess to avoid process.exit killing the test runner.
 * Writes a temp ESM script that imports args.js from the build directory.
 */
async function runGetToolArgs(
    argv: string[],
    usage: string,
    minArgs?: number
): Promise<{ result?: string[]; exitCode: number; stderr: string }> {
    const minArgsParam = minArgs !== undefined ? `, ${minArgs}` : "";
    const argsJson = JSON.stringify(["node", "test.js", ...argv]);
    const usageJson = JSON.stringify(usage);

    const script = `
import { createRequire } from "module";
process.argv = ${argsJson};

// Override process.exit to set exitCode and throw
const origExit = process.exit;
process.exit = ((code) => {
    process.exitCode = code || 1;
    throw new Error("EXIT");
});

try {
    const { getToolArgs } = await import("./args.js");
    const result = getToolArgs(${usageJson}${minArgsParam});
    process.stdout.write(JSON.stringify(result));
} catch (e) {
    if (e.message !== "EXIT") throw e;
}
`;

    const tmpFile = join(BUILD_DIR, `_test_args_${Date.now()}.mjs`);
    writeFileSync(tmpFile, script);

    try {
        const result = await secureSpawn("node", [tmpFile], { cwd: BUILD_DIR });
        let parsed: string[] | undefined;
        try {
            if (result.stdout) parsed = JSON.parse(result.stdout);
        } catch {
            // stdout wasn't valid JSON
        }
        return { result: parsed, exitCode: result.exitCode, stderr: result.stderr };
    } finally {
        try { unlinkSync(tmpFile); } catch { /* ignore */ }
    }
}

describe("getToolArgs", () => {
    it("extracts positional arguments", async () => {
        const r = await runGetToolArgs(["nmap"], "test <binary>");
        assert.equal(r.exitCode, 0);
        assert.deepEqual(r.result, ["nmap"]);
    });

    it("extracts multiple positional arguments", async () => {
        const r = await runGetToolArgs(
            ["python3", "commix.py"],
            "test <python> <script>",
            2
        );
        assert.equal(r.exitCode, 0);
        assert.deepEqual(r.result, ["python3", "commix.py"]);
    });

    it("strips --transport flag with separate value", async () => {
        const r = await runGetToolArgs(
            ["nmap", "--transport", "http"],
            "test <binary>"
        );
        assert.equal(r.exitCode, 0);
        assert.deepEqual(r.result, ["nmap"]);
    });

    it("strips --transport=value flag", async () => {
        const r = await runGetToolArgs(
            ["nmap", "--transport=http"],
            "test <binary>"
        );
        assert.equal(r.exitCode, 0);
        assert.deepEqual(r.result, ["nmap"]);
    });

    it("strips --port flag with separate value", async () => {
        const r = await runGetToolArgs(
            ["nmap", "--port", "3001"],
            "test <binary>"
        );
        assert.equal(r.exitCode, 0);
        assert.deepEqual(r.result, ["nmap"]);
    });

    it("strips --port=value flag", async () => {
        const r = await runGetToolArgs(
            ["--port=3001", "nmap"],
            "test <binary>"
        );
        assert.equal(r.exitCode, 0);
        assert.deepEqual(r.result, ["nmap"]);
    });

    it("strips both framework flags at once", async () => {
        const r = await runGetToolArgs(
            ["--transport", "http", "--port", "3001", "nmap"],
            "test <binary>"
        );
        assert.equal(r.exitCode, 0);
        assert.deepEqual(r.result, ["nmap"]);
    });

    it("exits with code 1 when too few args", async () => {
        const r = await runGetToolArgs([], "test <binary>");
        assert.notEqual(r.exitCode, 0);
    });

    it("exits with code 1 when minArgs not met", async () => {
        const r = await runGetToolArgs(["one"], "test <a> <b>", 2);
        assert.notEqual(r.exitCode, 0);
    });
});
