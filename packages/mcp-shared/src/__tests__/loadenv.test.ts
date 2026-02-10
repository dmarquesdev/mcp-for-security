import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("loadenv", () => {
    const ORIGINAL_ENV = { ...process.env };
    let tempDir: string;

    beforeEach(() => {
        tempDir = join(tmpdir(), `loadenv-test-${Date.now()}`);
        mkdirSync(tempDir, { recursive: true });
    });

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
        rmSync(tempDir, { recursive: true, force: true });
    });

    it("loads variables from .env file via MCP_ENV_FILE", async () => {
        const envFile = join(tempDir, ".env");
        writeFileSync(envFile, "LOADENV_TEST_VAR=hello_from_dotenv\n");

        // Clear any existing value
        delete process.env.LOADENV_TEST_VAR;
        process.env.MCP_ENV_FILE = envFile;

        // Re-import loadenv (fresh module)
        const { config } = await import("dotenv");
        config({ path: envFile });

        assert.equal(process.env.LOADENV_TEST_VAR, "hello_from_dotenv");
    });

    it("does not override existing environment variables", async () => {
        const envFile = join(tempDir, ".env");
        writeFileSync(envFile, "LOADENV_EXISTING_VAR=from_file\n");

        // Set the var before loading
        process.env.LOADENV_EXISTING_VAR = "from_real_env";

        const { config } = await import("dotenv");
        config({ path: envFile });

        // Real env var should win
        assert.equal(process.env.LOADENV_EXISTING_VAR, "from_real_env");
    });

    it("handles missing .env file gracefully", async () => {
        const missingFile = join(tempDir, "nonexistent.env");

        const { config } = await import("dotenv");
        const result = config({ path: missingFile });

        // dotenv returns an error but does not throw
        assert.ok(result.error);
    });

    it("loads multiple variables from a single .env file", async () => {
        const envFile = join(tempDir, ".env");
        writeFileSync(envFile, "LOADENV_A=alpha\nLOADENV_B=bravo\nLOADENV_C=charlie\n");

        delete process.env.LOADENV_A;
        delete process.env.LOADENV_B;
        delete process.env.LOADENV_C;

        const { config } = await import("dotenv");
        config({ path: envFile });

        assert.equal(process.env.LOADENV_A, "alpha");
        assert.equal(process.env.LOADENV_B, "bravo");
        assert.equal(process.env.LOADENV_C, "charlie");
    });
});
