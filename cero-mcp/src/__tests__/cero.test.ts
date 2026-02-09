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

describe("cero-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("cero");

    harness.server.tool(
        "do-cero",
        "Execute Cero, a high-performance certificate-based subdomain enumeration tool.",
        {
            target: z.string().describe("The target host or IP address to scan."),
            concurrency: z.number().optional().describe("Maximum number of concurrent TLS connections."),
            ports: z.array(z.string()).optional().describe("List of TLS ports to scan."),
            timeOut: z.number().optional().describe("Maximum time (in seconds) to wait for a TLS handshake."),
        },
        async ({ target, concurrency, ports, timeOut }) => {
            const ceroArgs = [target];
            if (concurrency) ceroArgs.push("-c", concurrency.toString());
            if (ports && ports.length > 0) ceroArgs.push("-p", ports.join(","));
            if (timeOut) ceroArgs.push("-t", timeOut.toString());
            const result = await mock.spawn("cero", ceroArgs);
            return formatToolResult(result, { toolName: "cero" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-cero tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-cero");
        await harness.cleanup();
    });

    it("passes target to spawn correctly with no optional params", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-cero", {
            target: "192.168.0.0/24",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "cero");
        assert.deepEqual(mock.calls[0].args, ["192.168.0.0/24"]);
        await harness.cleanup();
    });

    it("adds concurrency flag when provided", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-cero", {
            target: "example.com",
            concurrency: 100,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["example.com", "-c", "100"]);
        await harness.cleanup();
    });

    it("adds ports flag with comma-joined values", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-cero", {
            target: "example.com",
            ports: ["443", "8443", "9443"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["example.com", "-p", "443,8443,9443"]);
        await harness.cleanup();
    });

    it("adds timeout flag when provided", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-cero", {
            target: "example.com",
            timeOut: 10,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["example.com", "-t", "10"]);
        await harness.cleanup();
    });

    it("combines all optional params correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-cero", {
            target: "10.0.0.0/8",
            concurrency: 50,
            ports: ["443", "8443"],
            timeOut: 5,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["10.0.0.0/8", "-c", "50", "-p", "443,8443", "-t", "5"]);
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "*.example.com\nmail.example.com\nwww.example.com", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("cero-output");
        h.server.tool(
            "do-cero",
            "Run cero",
            {
                target: z.string(),
                concurrency: z.number().optional(),
                ports: z.array(z.string()).optional(),
                timeOut: z.number().optional(),
            },
            async ({ target, concurrency, ports, timeOut }) => {
                const ceroArgs = [target];
                if (concurrency) ceroArgs.push("-c", concurrency.toString());
                if (ports && ports.length > 0) ceroArgs.push("-p", ports.join(","));
                if (timeOut) ceroArgs.push("-t", timeOut.toString());
                const result = await customMock.spawn("cero", ceroArgs);
                return formatToolResult(result, { toolName: "cero" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-cero", {
            target: "example.com",
        });
        const text = getResultText(result);
        assert.ok(text.includes("*.example.com"));
        assert.ok(text.includes("www.example.com"));
        await h.cleanup();
    });

    it("skips ports flag when ports array is empty", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-cero", {
            target: "example.com",
            ports: [],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["example.com"]);
        await harness.cleanup();
    });

    it("rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-cero", {
            concurrency: 50,
        });
        await harness.cleanup();
    });
});
