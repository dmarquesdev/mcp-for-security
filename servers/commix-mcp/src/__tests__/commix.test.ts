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
import { formatToolResult } from "mcp-shared";

const PYTHON_PATH = "python3";
const COMMIX_SCRIPT = "commix.py";

describe("commix-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("commix");

    harness.server.tool(
        "do-commix",
        "Run Commix to test for command injection issues",
        {
            url: z.string().url().describe("Target URL to test"),
        },
        async ({ url }) => {
            const allArgs = [COMMIX_SCRIPT, "-u", url, url];
            const result = await mock.spawn(PYTHON_PATH, allArgs);
            return formatToolResult(result, { toolName: "commix", stripAnsi: true });
        },
    );

    afterEach(() => mock.reset());

    it("registers the do-commix tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-commix");
        await harness.cleanup();
    });

    it("passes python path, script, and url to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-commix", {
            url: "http://example.com/vuln",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "python3");
        assert.deepEqual(mock.calls[0].args, [
            "commix.py", "-u", "http://example.com/vuln", "http://example.com/vuln",
        ]);
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "[*] Testing connection to target URL.", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("commix-output");
        h.server.tool(
            "do-commix",
            "Run Commix",
            {
                url: z.string().url(),
            },
            async ({ url }) => {
                const allArgs = [COMMIX_SCRIPT, "-u", url, url];
                const result = await customMock.spawn(PYTHON_PATH, allArgs);
                return formatToolResult(result, { toolName: "commix", stripAnsi: true });
            },
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-commix", {
            url: "http://example.com/vuln",
        });
        const text = getResultText(result);
        assert.ok(text.includes("Testing connection to target URL"));
        await h.cleanup();
    });

    it("rejects when url is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-commix", {});
        await harness.cleanup();
    });

    it("rejects when url is not a valid URL", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-commix", {
            url: "not-a-url",
        });
        await harness.cleanup();
    });
});
