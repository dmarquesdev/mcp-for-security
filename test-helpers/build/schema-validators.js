"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertToolCallSucceeds = assertToolCallSucceeds;
exports.assertToolCallFails = assertToolCallFails;
exports.assertToolExists = assertToolExists;
exports.getResultText = getResultText;
/**
 * Assert that a tool call with the given arguments succeeds (does not throw
 * and returns non-error content).
 */
async function assertToolCallSucceeds(client, toolName, args) {
    const result = (await client.callTool({
        name: toolName,
        arguments: args,
    }));
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
async function assertToolCallFails(client, toolName, args) {
    try {
        const result = (await client.callTool({
            name: toolName,
            arguments: args,
        }));
        if (result.isError) {
            return; // Expected failure via isError
        }
        throw new Error(`Expected tool call to ${toolName} to fail, but it succeeded`);
    }
    catch (error) {
        // Expected — tool threw an error
        if (error instanceof Error &&
            error.message.includes("Expected tool call")) {
            throw error;
        }
        // Any other error is the expected failure
    }
}
/**
 * Assert that a tool exists in the server's tool list.
 */
async function assertToolExists(client, toolName) {
    const tools = await client.listTools();
    const found = tools.tools.find((t) => t.name === toolName);
    if (!found) {
        const available = tools.tools.map((t) => t.name).join(", ");
        throw new Error(`Tool "${toolName}" not found. Available: ${available}`);
    }
}
/**
 * Get the text content from a tool call result.
 */
function getResultText(result) {
    return result.content
        .filter((c) => c.type === "text" && c.text)
        .map((c) => c.text)
        .join("\n");
}
