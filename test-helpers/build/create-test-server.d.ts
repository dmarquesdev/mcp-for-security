import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
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
export declare function createTestServer(name: string): TestServerHarness;
