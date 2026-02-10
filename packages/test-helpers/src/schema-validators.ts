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
export async function assertToolCallSucceeds(
    client: Client,
    toolName: string,
    args: Record<string, unknown>
): Promise<ToolCallResult> {
    const result = (await client.callTool({
        name: toolName,
        arguments: args,
    })) as ToolCallResult;

    if (result.isError) {
        const text = result.content?.[0]?.text ?? "unknown error";
        throw new Error(`Tool call to ${toolName} returned error: ${text}`);
    }

    return result;
}

/**
 * Assert that a tool call with the given arguments fails (throws or returns
 * isError: true).
 */
export async function assertToolCallFails(
    client: Client,
    toolName: string,
    args: Record<string, unknown>
): Promise<void> {
    try {
        const result = (await client.callTool({
            name: toolName,
            arguments: args,
        })) as ToolCallResult;

        if (result.isError) {
            return; // Expected failure via isError
        }

        throw new Error(
            `Expected tool call to ${toolName} to fail, but it succeeded`
        );
    } catch (error) {
        // Expected — tool threw an error
        if (
            error instanceof Error &&
            error.message.includes("Expected tool call")
        ) {
            throw error;
        }
        // Any other error is the expected failure
    }
}

/**
 * Assert that a tool exists in the server's tool list.
 */
export async function assertToolExists(
    client: Client,
    toolName: string
): Promise<void> {
    const tools = await client.listTools();
    const found = tools.tools.find((t) => t.name === toolName);
    if (!found) {
        const available = tools.tools.map((t) => t.name).join(", ");
        throw new Error(
            `Tool "${toolName}" not found. Available: ${available}`
        );
    }
}

/**
 * Get the text content from a tool call result.
 */
export function getResultText(result: ToolCallResult): string {
    return result.content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text!)
        .join("\n");
}
