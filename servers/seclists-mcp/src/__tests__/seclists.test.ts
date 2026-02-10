import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
    createTestServer,
    assertToolExists,
    assertToolCallSucceeds,
    assertToolCallFails,
    getResultText,
} from "test-helpers";

describe("seclists-mcp", () => {
    const harness = createTestServer("seclists");

    // Tool 1: List top-level categories (no params)
    harness.server.tool(
        "do-seclists-list-categories",
        "List all top-level SecLists categories",
        {},
        async () => {
            const categories = [
                "Discovery",
                "Fuzzing",
                "Miscellaneous",
                "Passwords",
                "Pattern-Matching",
                "Payloads",
                "Usernames",
                "Web-Shells",
            ];
            return {
                content: [{
                    type: "text" as const,
                    text: `SecLists categories (${categories.length}):\n\n${categories.join("\n")}`,
                }],
            };
        }
    );

    // Tool 2: List wordlists in a category
    harness.server.tool(
        "do-seclists-list-wordlists",
        "List files and subdirectories within a SecLists category or path",
        {
            path: z.string().describe("Relative path within SecLists"),
        },
        async ({ path: userPath }) => {
            const output = `Contents of ${userPath}:\n\nDirectories:\n  dir1/\n  dir2/\n\nFiles:\n  common.txt (4.6 KB)\n  big.txt (180.3 KB)`;
            return {
                content: [{ type: "text" as const, text: output }],
            };
        }
    );

    // Tool 3: Search for wordlists by name pattern
    harness.server.tool(
        "do-seclists-search",
        "Search for wordlists by filename pattern across all SecLists categories",
        {
            pattern: z.string().describe("Search pattern to match against filenames"),
            max_results: z.number().optional().describe("Maximum number of results (default: 50)"),
        },
        async ({ pattern, max_results }) => {
            const limit = max_results ?? 50;
            const matches = [
                `Discovery/Web-Content/${pattern}-list.txt`,
                `Passwords/Common-Credentials/${pattern}.txt`,
                `Fuzzing/${pattern}-payloads.txt`,
            ];
            const limited = matches.slice(0, limit);
            return {
                content: [{
                    type: "text" as const,
                    text: `Search results for '${pattern}' (${matches.length} total):\n\n${limited.join("\n")}`,
                }],
            };
        }
    );

    // Tool 4: Get the absolute path to a wordlist file
    harness.server.tool(
        "do-seclists-get-path",
        "Get the absolute filesystem path to a SecLists wordlist file",
        {
            path: z.string().describe("Relative path within SecLists"),
        },
        async ({ path: userPath }) => {
            return {
                content: [{
                    type: "text" as const,
                    text: `Absolute path: /opt/seclists/${userPath}\nSize: 4.6 KB\nType: file`,
                }],
            };
        }
    );

    // Tool 5: Read wordlist contents
    harness.server.tool(
        "do-seclists-read-wordlist",
        "Read the contents of a SecLists wordlist file",
        {
            path: z.string().describe("Relative path to the wordlist file"),
            max_lines: z.number().optional().describe("Maximum number of lines to return (default: 500)"),
        },
        async ({ path: userPath, max_lines }) => {
            const limit = max_lines ?? 500;
            const lines = ["admin", "password", "root", "test", "user"];
            return {
                content: [{
                    type: "text" as const,
                    text: `File: ${userPath}\nTotal lines: ${lines.length}\nSize: 32 B\n\n${lines.slice(0, limit).join("\n")}`,
                }],
            };
        }
    );

    // --- Tool existence tests ---

    it("registers the do-seclists-list-categories tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-seclists-list-categories");
        await harness.cleanup();
    });

    it("registers the do-seclists-list-wordlists tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-seclists-list-wordlists");
        await harness.cleanup();
    });

    it("registers the do-seclists-search tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-seclists-search");
        await harness.cleanup();
    });

    it("registers the do-seclists-get-path tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-seclists-get-path");
        await harness.cleanup();
    });

    it("registers the do-seclists-read-wordlist tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-seclists-read-wordlist");
        await harness.cleanup();
    });

    // --- Functional tests ---

    it("do-seclists-list-categories returns category list", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(
            harness.client,
            "do-seclists-list-categories",
            {}
        );
        const text = getResultText(result);
        assert.ok(text.includes("SecLists categories"), "should include header");
        assert.ok(text.includes("Discovery"), "should include Discovery category");
        assert.ok(text.includes("Passwords"), "should include Passwords category");
        assert.ok(text.includes("Fuzzing"), "should include Fuzzing category");
        await harness.cleanup();
    });

    it("do-seclists-list-wordlists returns directory contents", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(
            harness.client,
            "do-seclists-list-wordlists",
            { path: "Discovery/Web-Content" }
        );
        const text = getResultText(result);
        assert.ok(text.includes("Contents of Discovery/Web-Content"));
        assert.ok(text.includes("common.txt"));
        await harness.cleanup();
    });

    it("do-seclists-search returns matching files", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(
            harness.client,
            "do-seclists-search",
            { pattern: "common" }
        );
        const text = getResultText(result);
        assert.ok(text.includes("Search results for 'common'"));
        assert.ok(text.includes("common"), "results should contain the search pattern");
        await harness.cleanup();
    });

    it("do-seclists-search respects max_results", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(
            harness.client,
            "do-seclists-search",
            { pattern: "sql", max_results: 2 }
        );
        const text = getResultText(result);
        // The mock returns 3 results but limited to 2
        // Count only file path lines (contain a slash), not the header line
        const fileLines = text.split("\n").filter((l) => l.includes("/"));
        assert.ok(fileLines.length <= 2, `should respect max_results limit, got ${fileLines.length} file lines`);
        await harness.cleanup();
    });

    it("do-seclists-get-path returns absolute path", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(
            harness.client,
            "do-seclists-get-path",
            { path: "Discovery/Web-Content/common.txt" }
        );
        const text = getResultText(result);
        assert.ok(text.includes("Absolute path:"), "should include absolute path label");
        assert.ok(text.includes("Discovery/Web-Content/common.txt"), "should include the file path");
        await harness.cleanup();
    });

    it("do-seclists-read-wordlist returns file contents", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(
            harness.client,
            "do-seclists-read-wordlist",
            { path: "Passwords/Common-Credentials/top-20.txt" }
        );
        const text = getResultText(result);
        assert.ok(text.includes("File:"), "should include file label");
        assert.ok(text.includes("Total lines:"), "should include line count");
        assert.ok(text.includes("admin"), "should include wordlist content");
        await harness.cleanup();
    });

    // --- Validation tests ---

    it("do-seclists-list-wordlists rejects when path is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-seclists-list-wordlists", {});
        await harness.cleanup();
    });

    it("do-seclists-search rejects when pattern is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-seclists-search", {});
        await harness.cleanup();
    });

    it("do-seclists-get-path rejects when path is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-seclists-get-path", {});
        await harness.cleanup();
    });

    it("do-seclists-read-wordlist rejects when path is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-seclists-read-wordlist", {});
        await harness.cleanup();
    });
});
