/**
 * Standardized CLI argument parsing for MCP servers.
 * Filters out framework-level flags (--transport, --port) so servers
 * receive only tool-specific positional arguments.
 */

const FRAMEWORK_FLAGS = ["--transport", "--port"];

/**
 * Extract tool-specific positional arguments from process.argv,
 * stripping framework flags consumed by startServer().
 *
 * Exits with a usage message if fewer than `minArgs` positional
 * arguments are provided.
 *
 * @param usage  - Human-readable usage string shown on error.
 * @param minArgs - Minimum number of positional args required (default 1).
 * @returns Array of positional argument strings.
 */
export function getToolArgs(usage: string, minArgs = 1): string[] {
    const rawArgs = process.argv.slice(2);
    const toolArgs: string[] = [];

    let i = 0;
    while (i < rawArgs.length) {
        const arg = rawArgs[i];

        // Check if this arg is a known framework flag
        const isFrameworkFlag = FRAMEWORK_FLAGS.some(
            (flag) => arg === flag || arg.startsWith(flag + "=")
        );

        if (isFrameworkFlag) {
            // Skip the flag's value too (unless it's in --flag=value form)
            if (!arg.includes("=") && i + 1 < rawArgs.length) {
                i++; // skip the value
            }
            i++;
            continue;
        }

        toolArgs.push(arg);
        i++;
    }

    if (toolArgs.length < minArgs) {
        console.error(`Usage: ${usage}`);
        process.exit(1);
    }

    return toolArgs;
}
