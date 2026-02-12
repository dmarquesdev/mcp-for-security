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

describe("masscan-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("masscan");

    harness.server.tool(
        "do-masscan",
        "Run masscan, a fast port scanner. Primary inputs are IP addresses/ranges and port numbers.",
        {
            target: z.string().describe("Target IP address or range (e.g. 1.1.1.1 or 10.0.0.0/8)"),
            port: z.string().describe("Target port or range (e.g. 80 or 0-65535)"),
            masscan_args: z.array(z.string()).describe("Additional masscan arguments (e.g. --max-rate)"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ target, port, masscan_args, timeoutSeconds }, extra) => {
            const result = await mock.spawn("masscan", ["-p" + port, target, ...masscan_args], buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "masscan", includeStderr: true });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-masscan tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-masscan");
        await harness.cleanup();
    });

    it("passes target, port, and args to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-masscan", {
            target: "192.168.1.0/24",
            port: "80,443",
            masscan_args: ["--max-rate", "1000"],
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "masscan");
        assert.deepEqual(mock.calls[0].args, ["-p80,443", "192.168.1.0/24", "--max-rate", "1000"]);
        await harness.cleanup();
    });

    it("constructs port flag with -p prefix", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-masscan", {
            target: "10.0.0.1",
            port: "0-65535",
            masscan_args: [],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-p0-65535", "10.0.0.1"]);
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "Discovered open port 80/tcp on 10.0.0.1", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("masscan-output");
        h.server.tool(
            "do-masscan",
            "Run masscan",
            {
                target: z.string(),
                port: z.string(),
                masscan_args: z.array(z.string()),
            },
            async ({ target, port, masscan_args }) => {
                const result = await customMock.spawn("masscan", ["-p" + port, target, ...masscan_args]);
                return formatToolResult(result, { toolName: "masscan", includeStderr: true });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-masscan", {
            target: "10.0.0.1",
            port: "80",
            masscan_args: [],
        });
        const text = getResultText(result);
        assert.ok(text.includes("Discovered open port 80/tcp on 10.0.0.1"));
        await h.cleanup();
    });

    it("handles empty masscan_args array", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-masscan", {
            target: "10.0.0.1",
            port: "80",
            masscan_args: [],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-p80", "10.0.0.1"]);
        await harness.cleanup();
    });

    it("rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-masscan", {
            port: "80",
            masscan_args: [],
        });
        await harness.cleanup();
    });

    it("rejects when port is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-masscan", {
            target: "10.0.0.1",
            masscan_args: [],
        });
        await harness.cleanup();
    });

    it("rejects when masscan_args is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-masscan", {
            target: "10.0.0.1",
            port: "80",
        });
        await harness.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-masscan", {
            target: "192.168.1.0/24",
            port: "80",
            masscan_args: [],
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
