import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readdir, stat } from "fs/promises";
import { join, relative } from "path";
import { sanitizePath } from "./sanitize.js";

const DEFAULT_SECLISTS_PATH = "/opt/seclists";

/**
 * Format a file size in bytes into a human-readable string.
 */
function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Recursively find files matching a case-insensitive substring pattern.
 */
async function findFiles(
    dir: string,
    pattern: string,
    basePath: string,
    results: string[] = [],
    maxResults = 50,
): Promise<string[]> {
    if (results.length >= maxResults) return results;
    const entries = await readdir(dir, { withFileTypes: true });
    const lowerPattern = pattern.toLowerCase();
    for (const entry of entries) {
        if (results.length >= maxResults) break;
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === ".git" || entry.name === "node_modules") continue;
            await findFiles(fullPath, pattern, basePath, results, maxResults);
        } else if (entry.name.toLowerCase().includes(lowerPattern)) {
            results.push(relative(basePath, fullPath));
        }
    }
    return results;
}

/**
 * Register a lightweight `do-list-wordlists` tool on the given MCP server.
 *
 * This replaces the dedicated seclists-mcp server with a single tool that can
 * browse and search the SecLists collection directly from the container's
 * filesystem. Use it in any server that consumes wordlists (ffuf, gobuster,
 * shuffledns, arjun, etc.).
 *
 * @param server   - The McpServer instance to register the tool on
 * @param basePath - Filesystem path to the SecLists root (default: /opt/seclists)
 */
export function registerSecListsTool(
    server: McpServer,
    basePath: string = DEFAULT_SECLISTS_PATH,
): void {
    server.tool(
        "do-list-wordlists",
        "List available SecLists wordlists at a given path. " +
            "Use empty path for top-level categories. " +
            `SecLists root: ${basePath}`,
        {
            path: z
                .string()
                .default("")
                .describe(
                    "Relative path within SecLists, e.g. 'Discovery/Web-Content'. Empty = top-level categories.",
                ),
            pattern: z
                .string()
                .optional()
                .describe(
                    "Filter filenames containing this substring (case-insensitive), e.g. 'common' or 'graphql'",
                ),
        },
        async ({ path: userPath, pattern }) => {
            // When a pattern is provided, do a recursive search
            if (pattern) {
                const searchBase = userPath
                    ? sanitizePath(userPath, basePath)
                    : basePath;
                const matches = await findFiles(searchBase, pattern, basePath);
                return {
                    content: [
                        {
                            type: "text" as const,
                            text:
                                `Search results for '${pattern}'` +
                                (userPath ? ` in ${userPath}` : "") +
                                ` (${matches.length} matches):\n\n` +
                                matches.map((m) => `  ${basePath}/${m}`).join("\n"),
                        },
                    ],
                };
            }

            // Otherwise list the directory contents
            const targetPath = userPath
                ? sanitizePath(userPath, basePath)
                : basePath;

            const targetStat = await stat(targetPath);
            if (!targetStat.isDirectory()) {
                return {
                    content: [
                        {
                            type: "text" as const,
                            text: `'${userPath}' is a file (${formatSize(targetStat.size)}). Full path: ${targetPath}`,
                        },
                    ],
                };
            }

            const entries = await readdir(targetPath, { withFileTypes: true });
            const dirs: string[] = [];
            const files: { name: string; size: number }[] = [];

            for (const entry of entries) {
                if (entry.name.startsWith(".")) continue;
                const fullPath = join(targetPath, entry.name);
                if (entry.isDirectory()) {
                    dirs.push(entry.name + "/");
                } else {
                    const fileStat = await stat(fullPath);
                    files.push({ name: entry.name, size: fileStat.size });
                }
            }

            dirs.sort();
            files.sort((a, b) => a.name.localeCompare(b.name));

            let output = userPath
                ? `Contents of ${userPath}:\n\n`
                : `SecLists categories:\n\n`;

            if (dirs.length > 0) {
                output += `Directories:\n${dirs.map((d) => `  ${d}`).join("\n")}\n\n`;
            }
            if (files.length > 0) {
                output += `Files:\n${files.map((f) => `  ${f.name} (${formatSize(f.size)})`).join("\n")}`;
            }
            if (dirs.length === 0 && files.length === 0) {
                output += "(empty)";
            }

            return { content: [{ type: "text" as const, text: output }] };
        },
    );
}
