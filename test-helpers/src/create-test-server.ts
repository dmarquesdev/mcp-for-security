import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

/**
 * Result of creating a test server harness.
 */
export interface TestServerHarness {
    /** The MCP server instance — register tools on this before connecting. */
    server: McpServer;
    /** The MCP client instance — call tools through this after connecting. */
    client: Client;
    /** Connect server and client via InMemoryTransport. Call after tool registration. */
    connect(): Promise<void>;
    /** Clean up both transports. */
    cleanup(): Promise<void>;
}

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
export function createTestServer(name: string): TestServerHarness {
    const server = new McpServer({ name, version: "1.0.0" });
    const client = new Client({ name: `${name}-test-client`, version: "1.0.0" });

    let clientTransport: InstanceType<typeof InMemoryTransport>;
    let serverTransport: InstanceType<typeof InMemoryTransport>;

    return {
        server,
        client,
        async connect() {
            const [ct, st] = InMemoryTransport.createLinkedPair();
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
