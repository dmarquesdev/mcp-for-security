import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readdir, readFile, stat } from "fs/promises";
import { join, relative } from "path";
import { startServer } from "mcp-shared";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: seclists-mcp <seclists-directory-path>");
    process.exit(1);
}

const seclistsPath = args[0];

const server = new McpServer({
    name: "seclists",
    version: "1.0.0",
});

// Helper: recursively find files matching a pattern
async function findFiles(dir: string, pattern: string, results: string[] = []): Promise<string[]> {
    const entries = await readdir(dir, { withFileTypes: true });
    const lowerPattern = pattern.toLowerCase();
    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === ".git" || entry.name === "node_modules") continue;
            await findFiles(fullPath, pattern, results);
        } else if (entry.name.toLowerCase().includes(lowerPattern)) {
            results.push(relative(seclistsPath, fullPath));
        }
    }
    return results;
}

// Helper: validate that a path stays within the SecLists directory
function safePath(userPath: string): string {
    const resolved = join(seclistsPath, userPath);
    if (!resolved.startsWith(seclistsPath)) {
        throw new Error("Path traversal detected — access denied");
    }
    return resolved;
}

// Tool 1: List top-level categories
server.tool(
    "seclists-list-categories",
    "List all top-level SecLists categories (Discovery, Passwords, Fuzzing, etc.)",
    {},
    async () => {
        const entries = await readdir(seclistsPath, { withFileTypes: true });
        const categories = entries
            .filter((e) => e.isDirectory() && !e.name.startsWith(".") && e.name !== "node_modules")
            .map((e) => e.name)
            .sort();

        return {
            content: [
                {
                    type: "text" as const,
                    text: `SecLists categories (${categories.length}):\n\n${categories.join("\n")}`,
                },
            ],
        };
    },
);

// Tool 2: List wordlists in a category or subdirectory
server.tool(
    "seclists-list-wordlists",
    "List files and subdirectories within a SecLists category or path. Example path: 'Discovery/Web-Content' or 'Passwords/Common-Credentials'",
    {
        path: z.string().describe("Relative path within SecLists, e.g. 'Discovery/Web-Content' or 'Passwords'"),
    },
    async ({ path: userPath }) => {
        const targetPath = safePath(userPath);
        const targetStat = await stat(targetPath);
        if (!targetStat.isDirectory()) {
            return {
                content: [{ type: "text" as const, text: `Error: '${userPath}' is not a directory` }],
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

        let output = `Contents of ${userPath}:\n\n`;
        if (dirs.length > 0) {
            output += `Directories:\n${dirs.map((d) => `  📁 ${d}`).join("\n")}\n\n`;
        }
        if (files.length > 0) {
            output += `Files:\n${files.map((f) => `  📄 ${f.name} (${formatSize(f.size)})`).join("\n")}`;
        }
        if (dirs.length === 0 && files.length === 0) {
            output += "(empty)";
        }

        return { content: [{ type: "text" as const, text: output }] };
    },
);

// Tool 3: Search for wordlists by name pattern
server.tool(
    "seclists-search",
    "Search for wordlists by filename pattern across all SecLists categories. Returns matching file paths.",
    {
        pattern: z.string().describe("Search pattern to match against filenames, e.g. 'common' or 'sql' or 'top-1000'"),
        max_results: z.number().optional().describe("Maximum number of results to return (default: 50)"),
    },
    async ({ pattern, max_results }) => {
        const limit = max_results ?? 50;
        const matches = await findFiles(seclistsPath, pattern);
        const limited = matches.slice(0, limit);

        let output = `Search results for '${pattern}' (${matches.length} total`;
        if (matches.length > limit) {
            output += `, showing first ${limit}`;
        }
        output += `):\n\n${limited.join("\n")}`;

        return { content: [{ type: "text" as const, text: output }] };
    },
);

// Tool 4: Get the absolute path to a wordlist file
server.tool(
    "seclists-get-path",
    "Get the absolute filesystem path to a SecLists wordlist file. Use this to pass wordlist paths to other tools like ffuf, gobuster, nuclei, etc.",
    {
        path: z.string().describe("Relative path within SecLists, e.g. 'Discovery/Web-Content/common.txt'"),
    },
    async ({ path: userPath }) => {
        const targetPath = safePath(userPath);
        const targetStat = await stat(targetPath);

        return {
            content: [
                {
                    type: "text" as const,
                    text: `Absolute path: ${targetPath}\nSize: ${formatSize(targetStat.size)}\nType: ${targetStat.isDirectory() ? "directory" : "file"}`,
                },
            ],
        };
    },
);

// Tool 5: Read wordlist contents
server.tool(
    "seclists-read-wordlist",
    "Read the contents of a SecLists wordlist file. For large files, returns a preview with line count.",
    {
        path: z.string().describe("Relative path to the wordlist file, e.g. 'Discovery/Web-Content/common.txt'"),
        max_lines: z.number().optional().describe("Maximum number of lines to return (default: 500). Use 0 to get line count only."),
    },
    async ({ path: userPath, max_lines }) => {
        const targetPath = safePath(userPath);
        const targetStat = await stat(targetPath);

        if (targetStat.isDirectory()) {
            return {
                content: [{ type: "text" as const, text: `Error: '${userPath}' is a directory, not a file. Use seclists-list-wordlists instead.` }],
            };
        }

        const limit = max_lines ?? 500;
        const content = await readFile(targetPath, "utf-8");
        const lines = content.split("\n");
        const totalLines = lines.length;

        if (limit === 0) {
            return {
                content: [
                    {
                        type: "text" as const,
                        text: `File: ${userPath}\nTotal lines: ${totalLines}\nSize: ${formatSize(targetStat.size)}`,
                    },
                ],
            };
        }

        const preview = lines.slice(0, limit).join("\n");
        let output = `File: ${userPath}\nTotal lines: ${totalLines}\nSize: ${formatSize(targetStat.size)}\n`;
        if (totalLines > limit) {
            output += `Showing first ${limit} lines:\n\n`;
        } else {
            output += `\n`;
        }
        output += preview;

        return { content: [{ type: "text" as const, text: output }] };
    },
);

function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function main() {
    await startServer(server);
    console.error("SecLists MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
