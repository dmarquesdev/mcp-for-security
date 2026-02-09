import type { SpawnResult } from "mcp-shared";
/**
 * A recorded call to the mock secureSpawn function.
 */
export interface SpawnCall {
    binary: string;
    args: string[];
    options?: unknown;
}
/**
 * Options for configuring the mock secureSpawn behavior.
 */
export interface MockSpawnOptions {
    /** Default result to return for all calls. */
    defaultResult?: SpawnResult;
    /** Map of binary names to specific results. */
    resultMap?: Map<string, SpawnResult>;
}
/**
 * Creates a mock secureSpawn function that records calls and returns
 * configurable results. Useful for testing MCP servers without
 * requiring actual security tools to be installed.
 */
export declare function createMockSpawn(options?: MockSpawnOptions): {
    /** The mock function — use in place of secureSpawn. */
    spawn: (binary: string, args: string[], spawnOptions?: unknown) => Promise<SpawnResult>;
    /** All recorded calls, in order. */
    calls: SpawnCall[];
    /** Reset recorded calls. */
    reset(): void;
    /** Get the last recorded call. */
    lastCall(): SpawnCall | undefined;
};
