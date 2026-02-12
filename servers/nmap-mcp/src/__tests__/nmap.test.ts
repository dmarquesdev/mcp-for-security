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
import { formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

describe("nmap-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("nmap");

    // Register the tool exactly as the server does
    harness.server.tool(
        "do-nmap",
        "Run nmap with specified target",
        {
            target: z.string().describe("Target ip to detect open ports"),
            nmap_args: z.array(z.string()).describe("Additional nmap arguments"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ target, nmap_args, timeoutSeconds }, extra) => {
            const result = await mock.spawn("nmap", [...nmap_args, target], buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "nmap", includeStderr: true });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-nmap tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-nmap");
        await harness.cleanup();
    });

    it("passes target and args to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-nmap", {
            target: "192.168.1.1",
            nmap_args: ["-sV", "-p", "80,443"],
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "nmap");
        assert.deepEqual(mock.calls[0].args, ["-sV", "-p", "80,443", "192.168.1.1"]);
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        mock.reset();
        const customMock = createMockSpawn({
            defaultResult: { stdout: "PORT  STATE SERVICE\n80/tcp open http", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("nmap-output");
        h.server.tool(
            "do-nmap",
            "Run nmap",
            {
                target: z.string(),
                nmap_args: z.array(z.string()),
            },
            async ({ target, nmap_args }) => {
                const result = await customMock.spawn("nmap", [...nmap_args, target]);
                return formatToolResult(result, { toolName: "nmap", includeStderr: true });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-nmap", {
            target: "10.0.0.1",
            nmap_args: [],
        });
        const text = getResultText(result);
        assert.ok(text.includes("80/tcp open http"));
        await h.cleanup();
    });

    it("handles empty nmap_args array", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-nmap", {
            target: "10.0.0.1",
            nmap_args: [],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["10.0.0.1"]);
        await harness.cleanup();
    });

    it("rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-nmap", {
            nmap_args: ["-sV"],
        });
        await harness.cleanup();
    });

    it("rejects when nmap_args is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-nmap", {
            target: "10.0.0.1",
        });
        await harness.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-nmap", {
            target: "192.168.1.1",
            nmap_args: ["-sV"],
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
