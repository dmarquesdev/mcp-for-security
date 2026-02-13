import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { TIMEOUT_SCHEMA, buildSpawnOptions } from "../timeout.js";

describe("TIMEOUT_SCHEMA", () => {
    it("accepts a positive number", () => {
        const result = TIMEOUT_SCHEMA.timeoutSeconds.parse(60);
        assert.equal(result, 60);
    });

    it("accepts undefined (optional)", () => {
        const result = TIMEOUT_SCHEMA.timeoutSeconds.parse(undefined);
        assert.equal(result, undefined);
    });

    it("rejects zero", () => {
        assert.throws(() => TIMEOUT_SCHEMA.timeoutSeconds.parse(0));
    });

    it("rejects negative numbers", () => {
        assert.throws(() => TIMEOUT_SCHEMA.timeoutSeconds.parse(-10));
    });
});

describe("buildSpawnOptions", () => {
    const fakeSignal = new AbortController().signal;

    it("passes signal through from extra", () => {
        const opts = buildSpawnOptions({ signal: fakeSignal });
        assert.equal(opts.signal, fakeSignal);
    });

    it("converts timeoutSeconds to timeoutMs", () => {
        const opts = buildSpawnOptions({ signal: fakeSignal }, { timeoutSeconds: 60 });
        assert.equal(opts.timeoutMs, 60_000);
    });

    it("uses defaultTimeoutMs when timeoutSeconds is not provided", () => {
        const opts = buildSpawnOptions({ signal: fakeSignal }, { defaultTimeoutMs: 600_000 });
        assert.equal(opts.timeoutMs, 600_000);
    });

    it("timeoutSeconds overrides defaultTimeoutMs", () => {
        const opts = buildSpawnOptions(
            { signal: fakeSignal },
            { timeoutSeconds: 120, defaultTimeoutMs: 600_000 }
        );
        assert.equal(opts.timeoutMs, 120_000);
    });

    it("omits timeoutMs when neither timeoutSeconds nor defaultTimeoutMs given", () => {
        const opts = buildSpawnOptions({ signal: fakeSignal });
        assert.equal(opts.timeoutMs, undefined);
    });

    it("passes stdinData through when provided", () => {
        const opts = buildSpawnOptions({ signal: fakeSignal }, { stdinData: "hello\n" });
        assert.equal(opts.stdinData, "hello\n");
    });

    it("omits stdinData when not provided", () => {
        const opts = buildSpawnOptions({ signal: fakeSignal }, { timeoutSeconds: 60 });
        assert.equal(opts.stdinData, undefined);
    });
});
