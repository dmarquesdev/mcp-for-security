import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { removeAnsiCodes, truncateOutput, sanitizePath } from "../sanitize.js";

describe("removeAnsiCodes", () => {
    it("strips SGR color codes", () => {
        const input = "\u001b[31mRed text\u001b[0m";
        assert.equal(removeAnsiCodes(input), "Red text");
    });

    it("returns plain text unchanged", () => {
        assert.equal(removeAnsiCodes("hello"), "hello");
    });

    it("handles empty string", () => {
        assert.equal(removeAnsiCodes(""), "");
    });
});

describe("truncateOutput", () => {
    it("returns short input unchanged", () => {
        assert.equal(truncateOutput("short", 100), "short");
    });

    it("truncates long input with notice", () => {
        const long = "a".repeat(200);
        const result = truncateOutput(long, 100);
        assert.ok(result.startsWith("a".repeat(100)));
        assert.ok(result.includes("[OUTPUT TRUNCATED"));
        assert.ok(result.includes("100 characters omitted"));
    });

    it("returns exact-length input unchanged", () => {
        const exact = "a".repeat(50);
        assert.equal(truncateOutput(exact, 50), exact);
    });
});

describe("sanitizePath", () => {
    it("allows paths within base", () => {
        const result = sanitizePath("subdir/file.txt", "/tmp/base");
        assert.equal(result, "/tmp/base/subdir/file.txt");
    });

    it("rejects path traversal", () => {
        assert.throws(
            () => sanitizePath("../../etc/passwd", "/tmp/base"),
            /Path traversal detected/
        );
    });

    it("allows base directory itself", () => {
        const result = sanitizePath(".", "/tmp/base");
        assert.equal(result, "/tmp/base");
    });
});
