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

describe("sqlmap-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("sqlmap");

    harness.server.tool(
        "do-sqlmap",
        "Run sqlmap for automated database security testing",
        {
            url: z.string().url().describe("Target URL to test"),
            sqlmap_args: z.array(z.string()).describe("Additional sqlmap arguments"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ url, sqlmap_args, timeoutSeconds }, extra) => {
            const result = await mock.spawn("sqlmap", ["-u", url, ...sqlmap_args], buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "sqlmap", includeStderr: true });
        },
    );

    afterEach(() => mock.reset());

    it("registers the do-sqlmap tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-sqlmap");
        await harness.cleanup();
    });

    it("passes url and args to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-sqlmap", {
            url: "http://example.com/vuln?id=1",
            sqlmap_args: ["--batch", "--dbs"],
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "sqlmap");
        assert.deepEqual(mock.calls[0].args, [
            "-u", "http://example.com/vuln?id=1", "--batch", "--dbs",
        ]);
        await harness.cleanup();
    });

    it("handles empty sqlmap_args array", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-sqlmap", {
            url: "http://example.com/vuln?id=1",
            sqlmap_args: [],
        });
        const last = mock.lastCall();
        assert.ok(last);
        assert.deepEqual(last.args, ["-u", "http://example.com/vuln?id=1"]);
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: {
                stdout: "[*] starting @ 12:00:00\navailable databases [3]:\n[*] information_schema\n[*] mysql\n[*] testdb",
                stderr: "",
                exitCode: 0,
            },
        });
        const h = createTestServer("sqlmap-output");
        h.server.tool(
            "do-sqlmap",
            "Run sqlmap",
            {
                url: z.string().url(),
                sqlmap_args: z.array(z.string()),
            },
            async ({ url, sqlmap_args }) => {
                const result = await customMock.spawn("sqlmap", ["-u", url, ...sqlmap_args]);
                return formatToolResult(result, { toolName: "sqlmap", includeStderr: true });
            },
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-sqlmap", {
            url: "http://example.com/vuln?id=1",
            sqlmap_args: ["--batch", "--dbs"],
        });
        const text = getResultText(result);
        assert.ok(text.includes("testdb"));
        await h.cleanup();
    });

    it("rejects when url is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-sqlmap", {
            sqlmap_args: ["--batch"],
        });
        await harness.cleanup();
    });

    it("rejects when sqlmap_args is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-sqlmap", {
            url: "http://example.com/vuln?id=1",
        });
        await harness.cleanup();
    });

    it("rejects when url is not a valid URL", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-sqlmap", {
            url: "not-a-url",
            sqlmap_args: [],
        });
        await harness.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-sqlmap", {
            url: "http://example.com/vuln?id=1",
            sqlmap_args: ["--batch"],
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
