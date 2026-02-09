"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createTestServer = createTestServer;
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const index_js_1 = require("@modelcontextprotocol/sdk/client/index.js");
const inMemory_js_1 = require("@modelcontextprotocol/sdk/inMemory.js");
/**
 * Creates a test harness with an McpServer and Client connected via
 * InMemoryTransport. No actual stdio or HTTP is involved.
 *
 * Usage:
 *   const { server, client, connect, cleanup } = createTestServer("my-tool");
 *   server.tool("do-my-tool", "desc", { ... }, handler);
 *   await connect();
 *   const result = await client.callTool({ name: "do-my-tool", arguments: { ... } });
 *   await cleanup();
 */
function createTestServer(name) {
    const server = new mcp_js_1.McpServer({ name, version: "1.0.0" });
    const client = new index_js_1.Client({ name: `${name}-test-client`, version: "1.0.0" });
    let clientTransport;
    let serverTransport;
    return {
        server,
        client,
        async connect() {
            const [ct, st] = inMemory_js_1.InMemoryTransport.createLinkedPair();
            clientTransport = ct;
            serverTransport = st;
            await server.connect(serverTransport);
            await client.connect(clientTransport);
        },
        async cleanup() {
            await clientTransport?.close();
            await serverTransport?.close();
        },
    };
}
