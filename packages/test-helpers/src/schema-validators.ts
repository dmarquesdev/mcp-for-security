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
 * isError: true). Optionally verify the error message matches an expected pattern.
 */
export async function assertToolCallFails(
    client: Client,
    toolName: string,
    args: Record<string, unknown>,
    expectedPattern?: string | RegExp
): Promise<void> {
    try {
        const result = (await client.callTool({
            name: toolName,
            arguments: args,
        })) as ToolCallResult;

        if (result.isError) {
            if (expectedPattern) {
                const text = result.content?.[0]?.text ?? "";
                const matches =
                    expectedPattern instanceof RegExp
                        ? expectedPattern.test(text)
                        : text.includes(expectedPattern);
                if (!matches) {
                    throw new Error(
                        `Tool ${toolName} failed as expected, but error "${text.slice(0, 200)}" did not match pattern: ${expectedPattern}`
                    );
                }
            }
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
        if (
            error instanceof Error &&
            error.message.includes("did not match pattern")
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
