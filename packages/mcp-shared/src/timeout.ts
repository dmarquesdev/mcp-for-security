import { z } from "zod";
import type { SpawnOptions } from "./spawn.js";

/**
 * Shared Zod schema field for client-configurable execution timeout.
 * Spread into any tool's parameter definition:
 *
 *   server.tool("do-example", "...", { target: z.string(), ...TIMEOUT_SCHEMA }, ...)
 */
export const TIMEOUT_SCHEMA = {
    timeoutSeconds: z
        .number()
        .positive()
        .optional()
        .describe("Maximum execution time in seconds (default: 300)"),
};

/**
 * Builds SpawnOptions from the client-supplied timeoutSeconds and
 * the MCP SDK's AbortSignal (extra.signal).
 *
 * @param extra  - The `extra` object from the MCP tool callback (must contain `signal`)
 * @param opts   - Optional overrides
 * @param opts.timeoutSeconds    - Client-supplied timeout (from Zod schema)
 * @param opts.defaultTimeoutMs  - Server-side default for tools that need longer than 5 min
 */
export function buildSpawnOptions(
    extra: { signal: AbortSignal },
    opts?: { timeoutSeconds?: number; defaultTimeoutMs?: number }
): SpawnOptions {
    const timeoutMs = opts?.timeoutSeconds
        ? opts.timeoutSeconds * 1000
        : opts?.defaultTimeoutMs;
    return { ...(timeoutMs !== undefined && { timeoutMs }), signal: extra.signal };
}
