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

describe("mobsf-mcp", () => {
    const harness = createTestServer("mobsf");

    // Register all 5 tools with mock handlers (no real MobSF API calls)
    harness.server.tool(
        "do-mobsf-scan",
        "Scan a file that has already been uploaded to MobSF",
        {
            hash: z.string().describe("Hash of the file to scan"),
            reScan: z.boolean().optional().describe("Set to true to force a rescan"),
        },
        async ({ hash, reScan }) => {
            const result = {
                scan_type: "apk",
                file_name: "test.apk",
                hash,
                reScan: reScan ?? false,
                status: "completed",
                findings: { high: 3, medium: 5, low: 12 },
            };
            return {
                content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-mobsf-upload",
        "Upload a mobile application file to MobSF for security analysis",
        {
            file: z.string().describe("Upload file path"),
        },
        async ({ file }) => {
            const result = {
                hash: "abc123def456",
                file_name: file.split("/").pop(),
                scan_type: "apk",
                status: "uploaded",
            };
            return {
                content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-mobsf-scan-logs",
        "Retrieve detailed scan logs for a previously analyzed mobile application",
        {
            hash: z.string().describe("Hash file to getting scan logs"),
        },
        async ({ hash }) => {
            const result = {
                hash,
                logs: ["Scan started", "Analyzing manifest", "Scan complete"],
            };
            return {
                content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-mobsf-json-report",
        "Generate and retrieve a comprehensive security analysis report in JSON format",
        {
            hash: z.string().describe("Hash file to getting scan logs"),
        },
        async ({ hash }) => {
            const result = {
                hash,
                report: { permissions: ["INTERNET", "CAMERA"], vulnerabilities: [] },
            };
            return {
                content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    harness.server.tool(
        "do-mobsf-recent-scans",
        "Retrieve a list of recently performed security scans",
        {
            page: z.number().describe("Page number for result"),
            pageSize: z.number().describe("Page size for result"),
        },
        async ({ page, pageSize }) => {
            const result = {
                page,
                pageSize,
                total: 42,
                scans: [
                    { hash: "aaa111", file_name: "app1.apk", status: "completed" },
                    { hash: "bbb222", file_name: "app2.ipa", status: "completed" },
                ],
            };
            return {
                content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
            };
        }
    );

    // --- Tool existence tests ---

    it("registers the do-mobsf-scan tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-mobsf-scan");
        await harness.cleanup();
    });

    it("registers the do-mobsf-upload tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-mobsf-upload");
        await harness.cleanup();
    });

    it("registers the do-mobsf-scan-logs tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-mobsf-scan-logs");
        await harness.cleanup();
    });

    it("registers the do-mobsf-json-report tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-mobsf-json-report");
        await harness.cleanup();
    });

    it("registers the do-mobsf-recent-scans tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-mobsf-recent-scans");
        await harness.cleanup();
    });

    // --- Functional tests ---

    it("do-mobsf-scan returns scan result with hash", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-mobsf-scan", {
            hash: "deadbeef1234",
        });
        const text = getResultText(result);
        const parsed = JSON.parse(text);
        assert.equal(parsed.hash, "deadbeef1234");
        assert.equal(parsed.status, "completed");
        assert.ok(parsed.findings, "should include findings");
        await harness.cleanup();
    });

    it("do-mobsf-scan accepts optional reScan flag", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-mobsf-scan", {
            hash: "deadbeef1234",
            reScan: true,
        });
        const text = getResultText(result);
        const parsed = JSON.parse(text);
        assert.equal(parsed.reScan, true);
        await harness.cleanup();
    });

    it("do-mobsf-upload returns upload confirmation with hash", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-mobsf-upload", {
            file: "/path/to/test.apk",
        });
        const text = getResultText(result);
        const parsed = JSON.parse(text);
        assert.equal(parsed.status, "uploaded");
        assert.equal(parsed.file_name, "test.apk");
        assert.ok(parsed.hash, "should return a hash");
        await harness.cleanup();
    });

    it("do-mobsf-recent-scans returns paginated results", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-mobsf-recent-scans", {
            page: 1,
            pageSize: 10,
        });
        const text = getResultText(result);
        const parsed = JSON.parse(text);
        assert.equal(parsed.page, 1);
        assert.equal(parsed.pageSize, 10);
        assert.ok(Array.isArray(parsed.scans), "scans should be an array");
        await harness.cleanup();
    });

    // --- Validation tests ---

    it("do-mobsf-scan rejects when hash is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-mobsf-scan", {});
        await harness.cleanup();
    });

    it("do-mobsf-upload rejects when file is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-mobsf-upload", {});
        await harness.cleanup();
    });

    it("do-mobsf-recent-scans rejects when page is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-mobsf-recent-scans", {
            pageSize: 10,
        });
        await harness.cleanup();
    });

    it("do-mobsf-recent-scans rejects when pageSize is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-mobsf-recent-scans", {
            page: 1,
        });
        await harness.cleanup();
    });
});
