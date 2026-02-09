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

describe("httpx-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("httpx");

    harness.server.tool(
        "do-httpx",
        "Scans the given target domains and detects active HTTP/HTTPS services",
        {
            target: z.array(z.string()),
            ports: z.array(z.number()).optional(),
            probes: z.array(z.string()).optional(),
        },
        async ({ target, ports, probes }) => {
            const httpxArgs = ["-u", target.join(","), "-silent"];
            if (ports && ports.length > 0) httpxArgs.push("-p", ports.join(","));
            if (probes && probes.length > 0) {
                for (const probe of probes) httpxArgs.push(`-${probe}`);
            }

            const result = await mock.spawn("httpx", httpxArgs);
            return formatToolResult(result, { toolName: "httpx" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-httpx tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-httpx");
        await harness.cleanup();
    });

    it("single target builds correct base args", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-httpx", {
            target: ["example.com"],
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "httpx");
        assert.deepEqual(mock.calls[0].args, ["-u", "example.com", "-silent"]);
        await harness.cleanup();
    });

    it("multiple targets are joined with comma", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-httpx", {
            target: ["a.com", "b.com", "c.com"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "a.com,b.com,c.com", "-silent"]);
        await harness.cleanup();
    });

    it("ports are joined with comma and appended with -p", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-httpx", {
            target: ["example.com"],
            ports: [80, 443, 8080],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "example.com", "-silent", "-p", "80,443,8080"]);
        await harness.cleanup();
    });

    it("empty ports array is not appended", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-httpx", {
            target: ["example.com"],
            ports: [],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "example.com", "-silent"]);
        await harness.cleanup();
    });

    it("probes are each prefixed with dash", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-httpx", {
            target: ["example.com"],
            probes: ["status-code", "title", "tech-detect"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "-u", "example.com", "-silent",
            "-status-code",
            "-title",
            "-tech-detect",
        ]);
        await harness.cleanup();
    });

    it("empty probes array is not appended", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-httpx", {
            target: ["example.com"],
            probes: [],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "example.com", "-silent"]);
        await harness.cleanup();
    });

    it("ports and probes combined build correct arg order", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-httpx", {
            target: ["example.com"],
            ports: [80, 443],
            probes: ["status-code", "web-server"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "-u", "example.com", "-silent",
            "-p", "80,443",
            "-status-code",
            "-web-server",
        ]);
        await harness.cleanup();
    });

    it("rejects when target is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-httpx", {});
        await harness.cleanup();
    });

    it("single port is handled correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-httpx", {
            target: ["example.com"],
            ports: [8443],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "example.com", "-silent", "-p", "8443"]);
        await harness.cleanup();
    });

    it("single probe is handled correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-httpx", {
            target: ["example.com"],
            probes: ["favicon"],
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["-u", "example.com", "-silent", "-favicon"]);
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: {
                stdout: "https://example.com [200] [nginx] [Example Domain]",
                stderr: "",
                exitCode: 0,
            },
        });
        const h = createTestServer("httpx-output");
        h.server.tool(
            "do-httpx",
            "scan",
            { target: z.array(z.string()) },
            async ({ target }) => {
                const result = await customMock.spawn("httpx", ["-u", target.join(","), "-silent"]);
                return formatToolResult(result, { toolName: "httpx" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-httpx", {
            target: ["example.com"],
        });
        const text = getResultText(result);
        assert.ok(text.includes("https://example.com"));
        assert.ok(text.includes("nginx"));
        await h.cleanup();
    });
});
