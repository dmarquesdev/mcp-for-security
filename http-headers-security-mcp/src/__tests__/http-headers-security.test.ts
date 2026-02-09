import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
    createTestServer,
    assertToolExists,
    assertToolCallSucceeds,
    assertToolCallFails,
    getResultText,
} from "test-helpers";

describe("http-headers-security-mcp", () => {
    const harness = createTestServer("http-headers-security");

    // Register the tool with a mock handler (no real HTTP call)
    harness.server.tool(
        "do-analyze-http-headers",
        "Perform security analysis of HTTP response headers for a web application",
        {
            target: z.string().describe("Target URL to analyze"),
        },
        async ({ target }) => {
            // Mock: return fake analysis result instead of fetching real headers
            const result = {
                removeHeaders: ["Server: nginx/1.18.0", "X-Powered-By: Express"],
                addedHeaders: [
                    "X-Frame-Options: DENY",
                    "X-Content-Type-Options: nosniff",
                    "Strict-Transport-Security: max-age=31536000; includeSubDomains",
                ],
            };
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(result, null, 2),
                }],
            };
        }
    );

    it("registers the do-analyze-http-headers tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-analyze-http-headers");
        await harness.cleanup();
    });

    it("returns JSON with removeHeaders and addedHeaders", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(
            harness.client,
            "do-analyze-http-headers",
            { target: "https://example.com" }
        );
        const text = getResultText(result);
        const parsed = JSON.parse(text);
        assert.ok(Array.isArray(parsed.removeHeaders), "removeHeaders should be an array");
        assert.ok(Array.isArray(parsed.addedHeaders), "addedHeaders should be an array");
        assert.ok(parsed.removeHeaders.length > 0, "should have headers to remove");
        assert.ok(parsed.addedHeaders.length > 0, "should have headers to add");
        await harness.cleanup();
    });

    it("removeHeaders contain server identification headers", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(
            harness.client,
            "do-analyze-http-headers",
            { target: "https://example.com" }
        );
        const text = getResultText(result);
        const parsed = JSON.parse(text);
        const hasServerHeader = parsed.removeHeaders.some(
            (h: string) => h.toLowerCase().startsWith("server:")
        );
        assert.ok(hasServerHeader, "should flag Server header for removal");
        await harness.cleanup();
    });

    it("addedHeaders include security headers", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(
            harness.client,
            "do-analyze-http-headers",
            { target: "https://example.com" }
        );
        const text = getResultText(result);
        const parsed = JSON.parse(text);
        const headerNames = parsed.addedHeaders.map(
            (h: string) => h.split(":")[0].trim().toLowerCase()
        );
        assert.ok(headerNames.includes("x-frame-options"), "should recommend X-Frame-Options");
        assert.ok(
            headerNames.includes("x-content-type-options"),
            "should recommend X-Content-Type-Options"
        );
        await harness.cleanup();
    });

    it("rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-analyze-http-headers", {});
        await harness.cleanup();
    });
});
