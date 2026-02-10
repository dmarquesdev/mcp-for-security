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
export function createMockSpawn(options: MockSpawnOptions = {}) {
    const calls: SpawnCall[] = [];
    const defaultResult: SpawnResult = options.defaultResult ?? {
        stdout: "mock output",
        stderr: "",
        exitCode: 0,
    };

    async function mockSpawn(
        binary: string,
        args: string[],
        spawnOptions?: unknown
    ): Promise<SpawnResult> {
        calls.push({ binary, args, options: spawnOptions });
        return options.resultMap?.get(binary) ?? defaultResult;
    }

    return {
        /** The mock function — use in place of secureSpawn. */
        spawn: mockSpawn,
        /** All recorded calls, in order. */
        calls,
        /** Reset recorded calls. */
        reset() {
            calls.length = 0;
        },
        /** Get the last recorded call. */
        lastCall(): SpawnCall | undefined {
            return calls[calls.length - 1];
        },
    };
}
