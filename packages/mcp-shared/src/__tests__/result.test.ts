import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatToolResult } from "../result.js";
import type { SpawnResult } from "../spawn.js";

describe("formatToolResult", () => {
    it("returns stdout on success", () => {
        const result: SpawnResult = { stdout: "output data", stderr: "", exitCode: 0 };
        const response = formatToolResult(result, { toolName: "test-tool" });
        assert.equal(response.content[0].text, "output data");
    });

    it("throws on nonzero exit code", () => {
        const result: SpawnResult = { stdout: "", stderr: "error info", exitCode: 1 };
        assert.throws(
            () => formatToolResult(result, { toolName: "test-tool" }),
            /test-tool exited with code 1/
        );
    });

    it("includes stderr in error message", () => {
        const result: SpawnResult = { stdout: "", stderr: "detailed error", exitCode: 2 };
        assert.throws(
            () => formatToolResult(result, { toolName: "mytool" }),
            /detailed error/
        );
    });

    it("appends stderr when includeStderr is true", () => {
        const result: SpawnResult = { stdout: "out", stderr: "err", exitCode: 0 };
        const response = formatToolResult(result, { toolName: "t", includeStderr: true });
        assert.equal(response.content[0].text, "outerr");
    });

    it("falls back to stderr when stdout is empty", () => {
        const result: SpawnResult = { stdout: "", stderr: "only stderr", exitCode: 0 };
        const response = formatToolResult(result, { toolName: "t" });
        assert.equal(response.content[0].text, "only stderr");
    });

    it("uses emptyMessage when no output", () => {
        const result: SpawnResult = { stdout: "", stderr: "", exitCode: 0 };
        const response = formatToolResult(result, { toolName: "t", emptyMessage: "Nothing found." });
        assert.equal(response.content[0].text, "Nothing found.");
    });

    it("uses default empty message", () => {
        const result: SpawnResult = { stdout: "", stderr: "", exitCode: 0 };
        const response = formatToolResult(result, { toolName: "mytool" });
        assert.equal(response.content[0].text, "No output from mytool.");
    });

    it("strips ANSI when stripAnsi is true", () => {
        const result: SpawnResult = { stdout: "\u001b[32mgreen\u001b[0m", stderr: "", exitCode: 0 };
        const response = formatToolResult(result, { toolName: "t", stripAnsi: true });
        assert.equal(response.content[0].text, "green");
    });

    it("strips ANSI from error output too", () => {
        const result: SpawnResult = { stdout: "", stderr: "\u001b[31merr\u001b[0m", exitCode: 1 };
        assert.throws(
            () => formatToolResult(result, { toolName: "t", stripAnsi: true }),
            (err: Error) => err.message.includes("err") && !err.message.includes("\u001b")
        );
    });
});
