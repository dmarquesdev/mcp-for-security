import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { secureSpawn, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

/** Helper to create connected server + client pair */
async function createPair(server: McpServer) {
    const client = new Client({ name: "test-client", version: "1.0.0" });
    const [clientTransport, serverTransport] =
        InMemoryTransport.createLinkedPair();
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return {
        client,
        async cleanup() {
            await clientTransport.close();
            await serverTransport.close();
        },
    };
}

describe("Integration: full MCP protocol with real secureSpawn", () => {
    it("executes echo through the full MCP stack", async () => {
        const server = new McpServer({ name: "echo-test", version: "1.0.0" });

        server.tool(
            "do-echo",
            "Echo a message using the system echo command",
            {
                message: z.string().describe("Message to echo"),
            },
            async ({ message }) => {
                const result = await secureSpawn("echo", [message]);
                return formatToolResult(result, { toolName: "echo" });
            }
        );

        const { client, cleanup } = await createPair(server);

        const tools = await client.listTools();
        assert.equal(tools.tools.length, 1);
        assert.equal(tools.tools[0].name, "do-echo");

        const result = await client.callTool({
            name: "do-echo",
            arguments: { message: "hello from integration test" },
        });

        const content = result.content as { type: string; text: string }[];
        assert.equal(content.length, 1);
        assert.equal(content[0].type, "text");
        assert.equal(content[0].text.trim(), "hello from integration test");

        await cleanup();
    });

    it("handles tool errors through the MCP stack", async () => {
        const server = new McpServer({ name: "fail-test", version: "1.0.0" });

        server.tool(
            "do-fail",
            "A tool that always fails",
            {
                code: z.number().describe("Exit code"),
            },
            async ({ code }) => {
                const result = await secureSpawn("node", [
                    "-e",
                    `process.exit(${code})`,
                ]);
                return formatToolResult(result, { toolName: "fail-test" });
            }
        );

        const { client, cleanup } = await createPair(server);

        const result = await client.callTool({
            name: "do-fail",
            arguments: { code: 1 },
        });

        assert.equal((result as { isError: boolean }).isError, true);

        await cleanup();
    });

    it("validates input schema through MCP protocol", async () => {
        const server = new McpServer({ name: "schema-test", version: "1.0.0" });

        server.tool(
            "do-validated",
            "A tool with a validated schema",
            {
                target: z.string(),
                count: z.number(),
            },
            async ({ target, count }) => {
                const result = await secureSpawn("echo", [
                    `${target}:${count}`,
                ]);
                return formatToolResult(result, { toolName: "validated" });
            }
        );

        const { client, cleanup } = await createPair(server);

        // Valid call
        const goodResult = await client.callTool({
            name: "do-validated",
            arguments: { target: "example.com", count: 5 },
        });
        const content = (goodResult.content as { type: string; text: string }[])[0];
        assert.equal(content.text.trim(), "example.com:5");

        // Invalid call — missing required field
        const badResult = await client.callTool({
            name: "do-validated",
            arguments: { target: "example.com" },
        });
        assert.equal((badResult as { isError: boolean }).isError, true);

        await cleanup();
    });

    it("handles stderr-only output on success", async () => {
        const server = new McpServer({ name: "stderr-test", version: "1.0.0" });

        server.tool(
            "do-stderr",
            "A tool that writes to stderr only",
            { msg: z.string() },
            async ({ msg }) => {
                const result = await secureSpawn("node", [
                    "-e",
                    `process.stderr.write("${msg}")`,
                ]);
                return formatToolResult(result, { toolName: "stderr-tool" });
            }
        );

        const { client, cleanup } = await createPair(server);

        const result = await client.callTool({
            name: "do-stderr",
            arguments: { msg: "warning info" },
        });

        // formatToolResult falls back to stderr when stdout is empty
        const content = result.content as { type: string; text: string }[];
        assert.equal(content[0].text, "warning info");

        await cleanup();
    });

    it("propagates timeout through the full MCP stack", async () => {
        const server = new McpServer({ name: "timeout-test", version: "1.0.0" });

        server.tool(
            "do-timed",
            "A tool with configurable timeout",
            {
                message: z.string(),
                ...TIMEOUT_SCHEMA,
            },
            async ({ message, timeoutSeconds }, extra) => {
                const result = await secureSpawn(
                    "echo",
                    [message],
                    buildSpawnOptions(extra, { timeoutSeconds })
                );
                return formatToolResult(result, { toolName: "timed" });
            }
        );

        const { client, cleanup } = await createPair(server);

        // Should succeed with generous timeout
        const result = await client.callTool({
            name: "do-timed",
            arguments: { message: "fast", timeoutSeconds: 30 },
        });

        const content = result.content as { type: string; text: string }[];
        assert.equal(content[0].text.trim(), "fast");

        await cleanup();
    });

    it("handles timeout expiration through the MCP stack", async () => {
        const server = new McpServer({ name: "timeout-expire-test", version: "1.0.0" });

        server.tool(
            "do-slow",
            "A tool that takes too long",
            {
                ...TIMEOUT_SCHEMA,
            },
            async ({ timeoutSeconds }, extra) => {
                const result = await secureSpawn(
                    "sleep",
                    ["30"],
                    buildSpawnOptions(extra, { timeoutSeconds })
                );
                return formatToolResult(result, { toolName: "slow" });
            }
        );

        const { client, cleanup } = await createPair(server);

        // Should fail with very short timeout
        const result = await client.callTool({
            name: "do-slow",
            arguments: { timeoutSeconds: 0.1 },
        });

        assert.equal((result as { isError: boolean }).isError, true);

        await cleanup();
    });

    it("lists multiple tools from the same server", async () => {
        const server = new McpServer({ name: "multi-tool-test", version: "1.0.0" });

        server.tool(
            "do-alpha",
            "First tool",
            { val: z.string() },
            async ({ val }) => {
                const result = await secureSpawn("echo", [`alpha:${val}`]);
                return formatToolResult(result, { toolName: "alpha" });
            }
        );

        server.tool(
            "do-beta",
            "Second tool",
            { val: z.string() },
            async ({ val }) => {
                const result = await secureSpawn("echo", [`beta:${val}`]);
                return formatToolResult(result, { toolName: "beta" });
            }
        );

        const { client, cleanup } = await createPair(server);

        const tools = await client.listTools();
        assert.equal(tools.tools.length, 2);
        const names = tools.tools.map((t) => t.name).sort();
        assert.deepEqual(names, ["do-alpha", "do-beta"]);

        // Call both tools
        const r1 = await client.callTool({ name: "do-alpha", arguments: { val: "x" } });
        const r2 = await client.callTool({ name: "do-beta", arguments: { val: "y" } });

        const t1 = (r1.content as { type: string; text: string }[])[0].text.trim();
        const t2 = (r2.content as { type: string; text: string }[])[0].text.trim();
        assert.equal(t1, "alpha:x");
        assert.equal(t2, "beta:y");

        await cleanup();
    });

    it("handles multiple sequential calls without state leakage", async () => {
        const server = new McpServer({ name: "sequential-test", version: "1.0.0" });

        server.tool(
            "do-counter",
            "Echo a value",
            { value: z.string() },
            async ({ value }) => {
                const result = await secureSpawn("echo", [value]);
                return formatToolResult(result, { toolName: "counter" });
            }
        );

        const { client, cleanup } = await createPair(server);

        // Make 5 sequential calls, each should return its own value
        for (let i = 0; i < 5; i++) {
            const result = await client.callTool({
                name: "do-counter",
                arguments: { value: `call-${i}` },
            });
            const content = result.content as { type: string; text: string }[];
            assert.equal(content[0].text.trim(), `call-${i}`);
        }

        await cleanup();
    });
});
