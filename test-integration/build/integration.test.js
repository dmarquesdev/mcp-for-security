"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const inMemory_js_1 = require("@modelcontextprotocol/sdk/inMemory.js");
const zod_1 = require("zod");
const mcp_shared_1 = require("mcp-shared");
(0, node_test_1.describe)("Integration: full MCP protocol with real secureSpawn", () => {
    (0, node_test_1.it)("executes echo through the full MCP stack", async () => {
        // Create a real MCP server with a tool that uses real secureSpawn
        const server = new mcp_js_1.McpServer({ name: "echo-test", version: "1.0.0" });
        server.tool("do-echo", "Echo a message using the system echo command", {
            message: zod_1.z.string().describe("Message to echo"),
        }, async ({ message }) => {
            const result = await (0, mcp_shared_1.secureSpawn)("echo", [message]);
            return (0, mcp_shared_1.formatToolResult)(result, { toolName: "echo" });
        });
        // Connect via InMemoryTransport (not stdio)
        const client = new index_js_1.Client({ name: "test-client", version: "1.0.0" });
        const [clientTransport, serverTransport] = inMemory_js_1.InMemoryTransport.createLinkedPair();
        await server.connect(serverTransport);
        await client.connect(clientTransport);
        // List tools — should find do-echo
        const tools = await client.listTools();
        strict_1.default.equal(tools.tools.length, 1);
        strict_1.default.equal(tools.tools[0].name, "do-echo");
        // Call the tool through the MCP protocol
        const result = await client.callTool({
            name: "do-echo",
            arguments: { message: "hello from integration test" },
        });
        // Verify the response
        const content = result.content;
        strict_1.default.equal(content.length, 1);
        strict_1.default.equal(content[0].type, "text");
        strict_1.default.equal(content[0].text.trim(), "hello from integration test");
        // Cleanup
        await clientTransport.close();
        await serverTransport.close();
    });
    (0, node_test_1.it)("handles tool errors through the MCP stack", async () => {
        const server = new mcp_js_1.McpServer({ name: "fail-test", version: "1.0.0" });
        server.tool("do-fail", "A tool that always fails", {
            code: zod_1.z.number().describe("Exit code"),
        }, async ({ code }) => {
            const result = await (0, mcp_shared_1.secureSpawn)("node", [
                "-e",
                `process.exit(${code})`,
            ]);
            return (0, mcp_shared_1.formatToolResult)(result, { toolName: "fail-test" });
        });
        const client = new index_js_1.Client({ name: "test-client", version: "1.0.0" });
        const [clientTransport, serverTransport] = inMemory_js_1.InMemoryTransport.createLinkedPair();
        await server.connect(serverTransport);
        await client.connect(clientTransport);
        // Call with nonzero exit code — formatToolResult should throw,
        // which MCP wraps as isError response
        const result = await client.callTool({
            name: "do-fail",
            arguments: { code: 1 },
        });
        strict_1.default.equal(result.isError, true);
        await clientTransport.close();
        await serverTransport.close();
    });
    (0, node_test_1.it)("validates input schema through MCP protocol", async () => {
        const server = new mcp_js_1.McpServer({ name: "schema-test", version: "1.0.0" });
        server.tool("do-validated", "A tool with a validated schema", {
            target: zod_1.z.string(),
            count: zod_1.z.number(),
        }, async ({ target, count }) => {
            const result = await (0, mcp_shared_1.secureSpawn)("echo", [
                `${target}:${count}`,
            ]);
            return (0, mcp_shared_1.formatToolResult)(result, { toolName: "validated" });
        });
        const client = new index_js_1.Client({ name: "test-client", version: "1.0.0" });
        const [clientTransport, serverTransport] = inMemory_js_1.InMemoryTransport.createLinkedPair();
        await server.connect(serverTransport);
        await client.connect(clientTransport);
        // Valid call
        const goodResult = await client.callTool({
            name: "do-validated",
            arguments: { target: "example.com", count: 5 },
        });
        const content = goodResult.content[0];
        strict_1.default.equal(content.text.trim(), "example.com:5");
        // Invalid call — missing required field
        const badResult = await client.callTool({
            name: "do-validated",
            arguments: { target: "example.com" },
        });
        strict_1.default.equal(badResult.isError, true);
        await clientTransport.close();
        await serverTransport.close();
    });
});
