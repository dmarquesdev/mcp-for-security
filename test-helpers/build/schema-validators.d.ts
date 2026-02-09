import type { Client } from "@modelcontextprotocol/sdk/client/index.js";
/**
 * Result content item from an MCP tool call.
 */
export interface ToolResultContent {
    type: string;
    text?: string;
}
/**
 * Result from an MCP tool call.
 */
export interface ToolCallResult {
    content: ToolResultContent[];
    isError?: boolean;
}
/**
 * Assert that a tool call with the given arguments succeeds (does not throw
 * and returns non-error content).
 */
export declare function assertToolCallSucceeds(client: Client, toolName: string, args: Record<string, unknown>): Promise<ToolCallResult>;
/**
 * Assert that a tool call with the given arguments fails (throws or returns
 * isError: true).
 */
export declare function assertToolCallFails(client: Client, toolName: string, args: Record<string, unknown>): Promise<void>;
/**
 * Assert that a tool exists in the server's tool list.
 */
export declare function assertToolExists(client: Client, toolName: string): Promise<void>;
/**
 * Get the text content from a tool call result.
 */
export declare function getResultText(result: ToolCallResult): string;
