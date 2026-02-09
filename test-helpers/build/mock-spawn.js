"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMockSpawn = createMockSpawn;
/**
 * Creates a mock secureSpawn function that records calls and returns
 * configurable results. Useful for testing MCP servers without
 * requiring actual security tools to be installed.
 */
function createMockSpawn(options = {}) {
    const calls = [];
    const defaultResult = options.defaultResult ?? {
        stdout: "mock output",
        stderr: "",
        exitCode: 0,
    };
    async function mockSpawn(binary, args, spawnOptions) {
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
        lastCall() {
            return calls[calls.length - 1];
        },
    };
}
