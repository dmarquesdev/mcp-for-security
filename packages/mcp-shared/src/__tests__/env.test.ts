import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { getEnvOrArg } from "../env.js";

describe("getEnvOrArg", () => {
    const ORIGINAL_ENV = { ...process.env };
    const ORIGINAL_ARGV = [...process.argv];

    afterEach(() => {
        process.env = { ...ORIGINAL_ENV };
        process.argv = [...ORIGINAL_ARGV];
    });

    it("prefers environment variable over CLI argument", () => {
        process.env.TEST_KEY = "from-env";
        process.argv = ["node", "test.js", "from-cli"];
        const result = getEnvOrArg("TEST_KEY", 2);
        assert.equal(result, "from-env");
    });

    it("falls back to CLI argument when env not set", () => {
        delete process.env.TEST_KEY;
        process.argv = ["node", "test.js", "from-cli"];
        const result = getEnvOrArg("TEST_KEY", 2);
        assert.equal(result, "from-cli");
    });

    it("returns undefined when neither env nor CLI is set", () => {
        delete process.env.TEST_KEY;
        process.argv = ["node", "test.js"];
        const result = getEnvOrArg("TEST_KEY", 5);
        assert.equal(result, undefined);
    });

    it("returns undefined for empty env string", () => {
        process.env.TEST_KEY = "";
        process.argv = ["node", "test.js"];
        const result = getEnvOrArg("TEST_KEY", 5);
        assert.equal(result, undefined);
    });

    it("uses CLI arg at correct index", () => {
        delete process.env.TEST_KEY;
        process.argv = ["node", "test.js", "zero", "one", "two"];
        assert.equal(getEnvOrArg("TEST_KEY", 2), "zero");
        assert.equal(getEnvOrArg("TEST_KEY", 3), "one");
        assert.equal(getEnvOrArg("TEST_KEY", 4), "two");
    });
});
