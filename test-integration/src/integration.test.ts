import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import { secureSpawn, formatToolResult } from "mcp-shared";

describe("Integration: full MCP protocol with real secureSpawn", () => {
    it("executes echo through the full MCP stack", async () => {
        // Create a real MCP server with a tool that uses real secureSpawn
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

        // Connect via InMemoryTransport (not stdio)
        const client = new Client({ name: "test-client", version: "1.0.0" });
        const [clientTransport, serverTransport] =
            InMemoryTransport.createLinkedPair();

        await server.connect(serverTransport);
        await client.connect(clientTransport);

        // List tools — should find do-echo
        const tools = await client.listTools();
        assert.equal(tools.tools.length, 1);
        assert.equal(tools.tools[0].name, "do-echo");

        // Call the tool through the MCP protocol
        const result = await client.callTool({
            name: "do-echo",
            arguments: { message: "hello from integration test" },
        });

        // Verify the response
        const content = result.content as { type: string; text: string }[];
        assert.equal(content.length, 1);
        assert.equal(content[0].type, "text");
        assert.equal(content[0].text.trim(), "hello from integration test");

        // Cleanup
        await clientTransport.close();
        await serverTransport.close();
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

        const client = new Client({ name: "test-client", version: "1.0.0" });
        const [clientTransport, serverTransport] =
            InMemoryTransport.createLinkedPair();

        await server.connect(serverTransport);
        await client.connect(clientTransport);

        // Call with nonzero exit code — formatToolResult should throw,
        // which MCP wraps as isError response
        const result = await client.callTool({
            name: "do-fail",
            arguments: { code: 1 },
        });

        assert.equal((result as { isError: boolean }).isError, true);

        await clientTransport.close();
        await serverTransport.close();
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

        const client = new Client({ name: "test-client", version: "1.0.0" });
        const [clientTransport, serverTransport] =
            InMemoryTransport.createLinkedPair();

        await server.connect(serverTransport);
        await client.connect(clientTransport);

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

        await clientTransport.close();
        await serverTransport.close();
    });
});
