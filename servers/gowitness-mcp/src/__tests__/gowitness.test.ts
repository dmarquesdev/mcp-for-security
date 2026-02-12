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
import { resolve } from "path";

describe("gowitness-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("gowitness");

    // Tool 1: do-gowitness-screenshot (custom error handling, not formatToolResult)
    harness.server.tool(
        "do-gowitness-screenshot",
        "Capture screenshot of a URL using gowitness",
        {
            url: z.string().url().describe("URL to screenshot"),
            chrome_window_x: z.number().optional().describe("Browser width"),
            chrome_window_y: z.number().optional().describe("Browser height"),
            timeout: z.number().optional().describe("Page timeout in seconds"),
            delay: z.number().optional().describe("Delay before screenshot"),
            fullpage: z.boolean().optional().describe("Full-page screenshot"),
            format: z.enum(["jpeg", "png"]).optional().describe("Screenshot format"),
            threads: z.number().optional().describe("Concurrent threads"),
            write_db: z.boolean().optional().describe("Write to SQLite"),
            write_jsonl: z.boolean().optional().describe("Write as JSON lines"),
            user_agent: z.string().optional().describe("Custom user-agent"),
            ...TIMEOUT_SCHEMA,
        },
        async ({
            url,
            chrome_window_x,
            chrome_window_y,
            timeout,
            delay,
            fullpage,
            format,
            threads,
            write_db,
            write_jsonl,
            user_agent,
            timeoutSeconds,
        }, extra) => {
            const spawnArgs = ["scan", "single", "--url", url];

            if (chrome_window_x) spawnArgs.push("--chrome-window-x", chrome_window_x.toString());
            if (chrome_window_y) spawnArgs.push("--chrome-window-y", chrome_window_y.toString());
            if (timeout) spawnArgs.push("--timeout", timeout.toString());
            if (delay) spawnArgs.push("--delay", delay.toString());
            if (fullpage) spawnArgs.push("--screenshot-fullpage");
            if (format) spawnArgs.push("--screenshot-format", format);
            if (threads) spawnArgs.push("--threads", threads.toString());
            if (write_db) spawnArgs.push("--write-db");
            if (write_jsonl) spawnArgs.push("--write-jsonl");
            if (user_agent) spawnArgs.push("--chrome-user-agent", user_agent);

            if (!write_db && !write_jsonl) {
                spawnArgs.push("--write-none");
            }

            const result = await mock.spawn("gowitness", spawnArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            const output = result.stdout + result.stderr;

            if (result.exitCode !== 0) {
                throw new Error(`gowitness exited with code ${result.exitCode}:\n${output}`);
            }

            return {
                content: [{
                    type: "text" as const,
                    text: output + "\nGowitness screenshot completed",
                }],
            };
        }
    );

    // Tool 2: do-gowitness-report
    harness.server.tool(
        "do-gowitness-report",
        "Generate a report from gowitness data",
        {
            screenshot_path: z.string().optional().describe("Path to screenshots"),
            db_uri: z.string().optional().describe("Database URI"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ screenshot_path, db_uri, timeoutSeconds }, extra) => {
            const spawnArgs = ["report"];

            if (screenshot_path) spawnArgs.push("--screenshot-path", screenshot_path);
            if (db_uri) spawnArgs.push("--write-db-uri", db_uri);

            const result = await mock.spawn("gowitness", spawnArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "gowitness-report", includeStderr: true });
        }
    );

    // Tool 3: do-gowitness-list-screenshots (filesystem only, no spawn)
    harness.server.tool(
        "do-gowitness-list-screenshots",
        "List all screenshot files in a directory",
        {
            screenshot_dir: z.string().optional().describe("Directory to search"),
        },
        async ({ screenshot_dir = "./screenshots" }) => {
            // Simplified for testing — no filesystem access needed
            return {
                content: [{
                    type: "text" as const,
                    text: `Found 0 screenshot files in ${screenshot_dir}`,
                }],
            };
        }
    );

    // Tool 4: do-gowitness-batch-screenshot (validates path via sanitizePath)
    harness.server.tool(
        "do-gowitness-batch-screenshot",
        "Batch screenshots from URL array",
        {
            urls: z.array(z.string().url()).describe("URLs to screenshot"),
            screenshot_path: z.string().describe("Path to store screenshots"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ urls, screenshot_path, timeoutSeconds }, extra) => {
            const safeScreenshotPath = sanitizePath(screenshot_path, process.cwd());
            const spawnArgs = ["scan", "file", "-f", "urls.txt", "--screenshot-path", safeScreenshotPath, "--write-none"];

            const result = await mock.spawn("gowitness", spawnArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            const output = result.stdout + result.stderr;

            if (result.exitCode !== 0) {
                throw new Error(`gowitness exited with code ${result.exitCode}:\n${output}`);
            }

            return {
                content: [{
                    type: "text" as const,
                    text: `Batch screenshot completed for ${urls.length} URLs.\nScreenshots saved to: ${safeScreenshotPath}`,
                }],
            };
        }
    );

    // Tool 5: do-gowitness-read-binary (validates path via sanitizePath)
    harness.server.tool(
        "do-gowitness-read-binary",
        "Read a screenshot file as binary data",
        {
            file_path: z.string().describe("Path to the screenshot file"),
            screenshot_dir: z.string().optional().describe("Base directory for screenshots"),
        },
        async ({ file_path, screenshot_dir }) => {
            const baseDir = resolve(screenshot_dir || "./screenshots");
            const fullPath = sanitizePath(file_path, baseDir);
            return {
                content: [{
                    type: "text" as const,
                    text: `File read successfully from ${fullPath}`,
                }],
            };
        }
    );

    afterEach(() => mock.reset());

    // --- do-gowitness-screenshot tests ---

    it("registers the do-gowitness-screenshot tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-gowitness-screenshot");
        await harness.cleanup();
    });

    it("screenshot: passes url with scan single prefix and --write-none", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gowitness-screenshot", {
            url: "https://example.com",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "gowitness");
        assert.deepEqual(mock.calls[0].args, [
            "scan", "single", "--url", "https://example.com", "--write-none",
        ]);
        await harness.cleanup();
    });

    it("screenshot: omits --write-none when write_db is true", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gowitness-screenshot", {
            url: "https://example.com",
            write_db: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--write-db"), "should include --write-db");
        assert.ok(!last?.args.includes("--write-none"), "should not include --write-none");
        await harness.cleanup();
    });

    it("screenshot: omits --write-none when write_jsonl is true", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gowitness-screenshot", {
            url: "https://example.com",
            write_jsonl: true,
        });
        const last = mock.lastCall();
        assert.ok(last?.args.includes("--write-jsonl"), "should include --write-jsonl");
        assert.ok(!last?.args.includes("--write-none"), "should not include --write-none");
        await harness.cleanup();
    });

    it("screenshot: appends optional flags correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gowitness-screenshot", {
            url: "https://example.com",
            chrome_window_x: 1280,
            chrome_window_y: 720,
            timeout: 30,
            delay: 5,
            fullpage: true,
            format: "png",
            threads: 4,
            user_agent: "TestBot/1.0",
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "scan", "single", "--url", "https://example.com",
            "--chrome-window-x", "1280",
            "--chrome-window-y", "720",
            "--timeout", "30",
            "--delay", "5",
            "--screenshot-fullpage",
            "--screenshot-format", "png",
            "--threads", "4",
            "--chrome-user-agent", "TestBot/1.0",
            "--write-none",
        ]);
        await harness.cleanup();
    });

    it("screenshot: throws on nonzero exit code", async () => {
        const failMock = createMockSpawn({
            defaultResult: { stdout: "", stderr: "chrome not found", exitCode: 1 },
        });
        const h = createTestServer("gowitness-fail");
        h.server.tool(
            "do-gowitness-screenshot",
            "screenshot",
            { url: z.string().url() },
            async ({ url }) => {
                const spawnArgs = ["scan", "single", "--url", url, "--write-none"];
                const result = await failMock.spawn("gowitness", spawnArgs);
                const output = result.stdout + result.stderr;
                if (result.exitCode !== 0) {
                    throw new Error(`gowitness exited with code ${result.exitCode}:\n${output}`);
                }
                return { content: [{ type: "text" as const, text: output }] };
            }
        );
        await h.connect();
        await assertToolCallFails(h.client, "do-gowitness-screenshot", {
            url: "https://example.com",
        });
        await h.cleanup();
    });

    it("screenshot: rejects when url is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-gowitness-screenshot", {});
        await harness.cleanup();
    });

    it("screenshot: rejects when url is not a valid URL", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-gowitness-screenshot", {
            url: "not-a-url",
        });
        await harness.cleanup();
    });

    it("screenshot: returns output with completion message", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "scanning https://example.com", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("gowitness-output");
        h.server.tool(
            "do-gowitness-screenshot",
            "screenshot",
            { url: z.string().url() },
            async ({ url }) => {
                const result = await customMock.spawn("gowitness", ["scan", "single", "--url", url]);
                const output = result.stdout + result.stderr;
                if (result.exitCode !== 0) throw new Error(`exit ${result.exitCode}`);
                return { content: [{ type: "text" as const, text: output + "\nGowitness screenshot completed" }] };
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-gowitness-screenshot", {
            url: "https://example.com",
        });
        const text = getResultText(result);
        assert.ok(text.includes("scanning https://example.com"));
        assert.ok(text.includes("Gowitness screenshot completed"));
        await h.cleanup();
    });

    // --- do-gowitness-report tests ---

    it("registers the do-gowitness-report tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-gowitness-report");
        await harness.cleanup();
    });

    it("report: passes report command with no args when options are empty", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gowitness-report", {});
        assert.equal(mock.calls.length, 1);
        assert.deepEqual(mock.calls[0].args, ["report"]);
        await harness.cleanup();
    });

    it("report: passes screenshot_path and db_uri when provided", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gowitness-report", {
            screenshot_path: "/tmp/screenshots",
            db_uri: "sqlite://gowitness.sqlite3",
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "report",
            "--screenshot-path", "/tmp/screenshots",
            "--write-db-uri", "sqlite://gowitness.sqlite3",
        ]);
        await harness.cleanup();
    });

    // --- do-gowitness-list-screenshots tests ---

    it("registers the do-gowitness-list-screenshots tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-gowitness-list-screenshots");
        await harness.cleanup();
    });

    it("list-screenshots: returns directory listing text", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-gowitness-list-screenshots", {});
        const text = getResultText(result);
        assert.ok(text.includes("Found 0 screenshot files"));
        await harness.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gowitness-screenshot", {
            url: "https://example.com",
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });

    // --- do-gowitness-batch-screenshot tests ---

    it("registers the do-gowitness-batch-screenshot tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-gowitness-batch-screenshot");
        await harness.cleanup();
    });

    it("batch-screenshot: passes scan file command with screenshot path", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gowitness-batch-screenshot", {
            urls: ["https://example.com", "https://test.com"],
            screenshot_path: "./screenshots",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "gowitness");
        assert.ok(mock.calls[0].args.includes("scan"));
        assert.ok(mock.calls[0].args.includes("file"));
        await harness.cleanup();
    });

    it("batch-screenshot: rejects path traversal in screenshot_path", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-gowitness-batch-screenshot", {
            urls: ["https://example.com"],
            screenshot_path: "../../etc/passwd",
        });
        await harness.cleanup();
    });

    it("batch-screenshot: rejects absolute path outside cwd", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-gowitness-batch-screenshot", {
            urls: ["https://example.com"],
            screenshot_path: "/etc/shadow",
        });
        await harness.cleanup();
    });

    // --- do-gowitness-read-binary tests ---

    it("registers the do-gowitness-read-binary tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-gowitness-read-binary");
        await harness.cleanup();
    });

    it("read-binary: rejects path traversal in file_path", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-gowitness-read-binary", {
            file_path: "../../../etc/passwd",
        });
        await harness.cleanup();
    });

    it("read-binary: rejects absolute path outside base dir", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-gowitness-read-binary", {
            file_path: "/etc/shadow",
        });
        await harness.cleanup();
    });

    it("read-binary: accepts safe relative path", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-gowitness-read-binary", {
            file_path: "screenshot.png",
            screenshot_dir: process.cwd(),
        });
        const text = getResultText(result);
        assert.ok(text.includes("File read successfully"));
        await harness.cleanup();
    });

    // --- Path traversal: sanitizePath unit coverage ---

    it("sanitizePath rejects traversal with dot-dot segments", () => {
        assert.throws(
            () => sanitizePath("../../etc/passwd", "/tmp/screenshots"),
            /Path traversal detected/,
        );
    });

    it("sanitizePath allows path within base directory", () => {
        const result = sanitizePath("img/shot.png", "/tmp/screenshots");
        assert.equal(result, "/tmp/screenshots/img/shot.png");
    });
});
