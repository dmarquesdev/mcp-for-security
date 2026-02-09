import type { SpawnResult } from "./spawn.js";
import { removeAnsiCodes } from "./sanitize.js";

/**
 * Options for formatting a process result into MCP tool output.
 */
export interface FormatResultOptions {
    /** Tool name used in error and fallback messages. */
    toolName: string;
    /** Always append stderr to stdout in success output. Default: false. */
    includeStderr?: boolean;
    /** Strip ANSI escape codes from output (useful for Python tools). Default: false. */
    stripAnsi?: boolean;
    /** Custom message when output is empty. Defaults to "No output from <toolName>." */
    emptyMessage?: string;
}

/** Standard MCP text content return type. */
export type ToolContent = { content: { type: "text"; text: string }[] };

/**
 * Convert a SpawnResult into a standardized MCP tool response.
 *
 * - Throws on nonzero exit code with a consistent error format.
 * - Composes stdout (optionally + stderr) for success output.
 * - Optionally strips ANSI codes.
 * - Returns a fallback message when output is empty.
 */
export function formatToolResult(
    result: SpawnResult,
    options: FormatResultOptions
): ToolContent {
    const { toolName, includeStderr = false, stripAnsi = false, emptyMessage } = options;

    // Error path — nonzero exit
    if (result.exitCode !== 0) {
        const errorBody = result.stderr || result.stdout || "Unknown error";
        const cleaned = stripAnsi ? removeAnsiCodes(errorBody) : errorBody;
        throw new Error(
            `${toolName} exited with code ${result.exitCode}:\n${cleaned}`
        );
    }

    // Success path — compose output
    let output = result.stdout;
    if (includeStderr && result.stderr) {
        output = output + result.stderr;
    } else if (!output && result.stderr) {
        // Fallback: use stderr if stdout is empty
        output = result.stderr;
    }

    if (stripAnsi) {
        output = removeAnsiCodes(output);
    }

    return {
        content: [
            {
                type: "text" as const,
                text: output || emptyMessage || `No output from ${toolName}.`,
            },
        ],
    };
}
