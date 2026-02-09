import { resolve, normalize } from "path";

/**
 * Comprehensive ANSI escape code removal.
 * Covers SGR (colors), cursor movement, erase, OSC, and other sequences.
 */
export function removeAnsiCodes(input: string): string {
    return input.replace(
        // eslint-disable-next-line no-control-regex
        /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><~]/g,
        ""
    );
}

/**
 * Truncate output to a maximum character length with a notice appended.
 */
export function truncateOutput(input: string, maxLength: number): string {
    if (input.length <= maxLength) return input;
    return (
        input.slice(0, maxLength) +
        `\n\n[OUTPUT TRUNCATED — ${input.length - maxLength} characters omitted]`
    );
}

/**
 * Validate and resolve a user-provided path against an allowed base directory.
 * Prevents path traversal attacks by ensuring the resolved path stays within bounds.
 * Throws if the path escapes the allowed base.
 */
export function sanitizePath(userPath: string, allowedBase: string): string {
    const resolvedBase = resolve(normalize(allowedBase));
    const resolvedPath = resolve(resolvedBase, normalize(userPath));

    if (!resolvedPath.startsWith(resolvedBase + "/") && resolvedPath !== resolvedBase) {
        throw new Error("Path traversal detected — access denied");
    }

    return resolvedPath;
}
