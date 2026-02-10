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

describe("crtsh-mcp", () => {
    const harness = createTestServer("crtsh");

    // Register the tool with a mock handler (no real HTTP call)
    harness.server.tool(
        "do-crtsh",
        "Discovers subdomains from SSL certificate logs",
        {
            target: z.string().describe("Target domain to analyze (e.g., example.com)."),
        },
        async ({ target }) => {
            // Mock: return fake subdomain data instead of calling crt.sh API
            const domains = [
                `sub1.${target}`,
                `sub2.${target}`,
                `mail.${target}`,
            ];
            return {
                content: [{
                    type: "text" as const,
                    text: JSON.stringify(domains, null, 2),
                }],
            };
        }
    );

    it("registers the do-crtsh tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-crtsh");
        await harness.cleanup();
    });

    it("returns JSON array of subdomains", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-crtsh", {
            target: "example.com",
        });
        const text = getResultText(result);
        const parsed = JSON.parse(text);
        assert.ok(Array.isArray(parsed), "result should be a JSON array");
        assert.equal(parsed.length, 3);
        assert.ok(parsed.includes("sub1.example.com"));
        assert.ok(parsed.includes("sub2.example.com"));
        assert.ok(parsed.includes("mail.example.com"));
        await harness.cleanup();
    });

    it("includes target domain in subdomain results", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-crtsh", {
            target: "test.org",
        });
        const text = getResultText(result);
        const parsed = JSON.parse(text);
        for (const domain of parsed) {
            assert.ok(
                (domain as string).endsWith(".test.org"),
                `expected ${domain} to end with .test.org`
            );
        }
        await harness.cleanup();
    });

    it("rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-crtsh", {});
        await harness.cleanup();
    });
});
