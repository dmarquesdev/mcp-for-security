/**
 * Get a value from an environment variable, falling back to a CLI argument by index.
 * Returns undefined if neither is available.
 */
export function getEnvOrArg(envName: string, argIndex: number): string | undefined {
    return process.env[envName] || process.argv[argIndex] || undefined;
}
