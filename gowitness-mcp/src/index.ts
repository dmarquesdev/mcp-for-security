import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { readFile, access, readdir, writeFile, unlink, stat } from "fs/promises";
import { join, resolve } from "path";
import { secureSpawn, sanitizePath, startServer, getToolArgs } from "mcp-shared";

const args = getToolArgs("gowitness-mcp <gowitness binary>");
const gowitnessPath = args[0];

// Create MCP Server
const server = new McpServer({
    name: "gowitness",
    version: "1.0.0",
});

// Tool: Enhanced 'screenshot' mode with binary return option
server.tool(
    "gowitness-screenshot",
    "Capture screenshot of the given URL using gowitness scan single. Can save to directory or return as binary data.",
    {
        url: z.string().url().describe("URL to take a screenshot of"),
        chrome_window_x: z.number().optional().describe("Chrome browser window width in pixels (default 1920)"),
        chrome_window_y: z.number().optional().describe("Chrome browser window height in pixels (default 1080)"),
        screenshot_path: z.string().optional().describe("Path to store screenshots (default ./screenshots)"),
        return_binary: z.boolean().optional().describe("If true, return screenshot as binary array instead of saving"),
        timeout: z.number().optional().describe("Number of seconds before considering a page timed out (default 60)"),
        delay: z.number().optional().describe("Number of seconds delay between navigation and screenshotting (default 3)"),
        fullpage: z.boolean().optional().describe("Do full-page screenshots, instead of just the viewport"),
        format: z.enum(["jpeg", "png"]).optional().describe("Screenshot format (default jpeg)"),
        threads: z.number().optional().describe("Number of concurrent threads (default 6)"),
        write_db: z.boolean().optional().describe("Write results to SQLite database"),
        write_jsonl: z.boolean().optional().describe("Write results as JSON lines"),
        user_agent: z.string().optional().describe("Custom user-agent string")
    },
    async ({
        url,
        chrome_window_x,
        chrome_window_y,
        screenshot_path,
        return_binary = false,
        timeout,
        delay,
        fullpage,
        format,
        threads,
        write_db,
        write_jsonl,
        user_agent
    }) => {
        const spawnArgs = ["scan", "single", "--url", url];

        if (chrome_window_x) spawnArgs.push("--chrome-window-x", chrome_window_x.toString());
        if (chrome_window_y) spawnArgs.push("--chrome-window-y", chrome_window_y.toString());
        if (screenshot_path) spawnArgs.push("--screenshot-path", screenshot_path);
        if (timeout) spawnArgs.push("--timeout", timeout.toString());
        if (delay) spawnArgs.push("--delay", delay.toString());
        if (fullpage) spawnArgs.push("--screenshot-fullpage");
        if (format) spawnArgs.push("--screenshot-format", format);
        if (threads) spawnArgs.push("--threads", threads.toString());
        if (write_db) spawnArgs.push("--write-db");
        if (write_jsonl) spawnArgs.push("--write-jsonl");
        if (user_agent) spawnArgs.push("--chrome-user-agent", user_agent);

        if (!write_db && !write_jsonl) {
            spawnArgs.push("--write-none");
        }

        const result = await secureSpawn(gowitnessPath, spawnArgs);
        const output = result.stdout + result.stderr;

        if (result.exitCode !== 0) {
            throw new Error(`gowitness exited with code ${result.exitCode}:\n${output}`);
        }

        if (return_binary) {
            const screenshotDir = screenshot_path || "./screenshots";
            const files = await readdir(screenshotDir);

            let screenshotFile = files.find(file =>
                (file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.jpg')) &&
                file.includes(getHostnameFromUrl(url))
            );

            if (!screenshotFile) {
                const hostname = getHostnameFromUrl(url);
                const domainParts = hostname.split('_').filter(part => part.length > 0);

                screenshotFile = files.find(file =>
                    (file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.jpg')) &&
                    domainParts.some(part => file.includes(part))
                );
            }

            if (!screenshotFile) {
                const imageFiles = files.filter(file =>
                    file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.jpg')
                );

                if (imageFiles.length > 0) {
                    screenshotFile = imageFiles[imageFiles.length - 1];
                }
            }

            if (!screenshotFile) {
                throw new Error("Screenshot file not found after gowitness execution");
            }

            // Validate the resolved path stays within screenshotDir
            const safePath = sanitizePath(screenshotFile, resolve(screenshotDir));
            const binaryData = await readFile(safePath);

            return {
                content: [{
                    type: "text" as const,
                    text: `Screenshot captured successfully. Binary data size: ${binaryData.length} bytes. Binary data: ${binaryData.toString('base64')} `,
                }],
            };
        } else {
            return {
                content: [{
                    type: "text" as const,
                    text: output + "\nGowitness screenshot completed successfully" +
                          (screenshot_path ? ` Screenshots saved to: ${screenshot_path}` : " Screenshots saved to: ./screenshots")
                }]
            };
        }
    }
);

// Tool: Enhanced 'report' mode
server.tool(
    "gowitness-report",
    "Generate a report from gowitness screenshots and data",
    {
        screenshot_path: z.string().optional().describe("Path where gowitness stored screenshots"),
        db_uri: z.string().optional().describe("Database URI to generate report from (e.g., sqlite://gowitness.sqlite3)"),
        output_format: z.enum(["html", "csv", "json"]).optional().describe("Report output format"),
    },
    async ({ screenshot_path, db_uri, output_format = "html" }) => {
        const spawnArgs = ["report"];

        if (screenshot_path) spawnArgs.push("--screenshot-path", screenshot_path);
        if (db_uri) spawnArgs.push("--write-db-uri", db_uri);

        const result = await secureSpawn(gowitnessPath, spawnArgs);
        const output = result.stdout + result.stderr;

        if (result.exitCode !== 0) {
            throw new Error(`gowitness exited with code ${result.exitCode}:\n${output}`);
        }

        return {
            content: [{
                type: "text" as const,
                text: output + `\nGowitness report generated successfully`
            }]
        };
    }
);

// Tool: Batch screenshot with file-based approach
server.tool(
    "gowitness-batch-screenshot",
    "Capture screenshots of multiple URLs using gowitness scan file command",
    {
        urls: z.array(z.string().url()).describe("Array of URLs to screenshot"),
        screenshot_path: z.string().describe("Path to store screenshots"),
        chrome_window_x: z.number().optional().describe("Chrome browser window width in pixels"),
        chrome_window_y: z.number().optional().describe("Chrome browser window height in pixels"),
        timeout: z.number().optional().describe("Number of seconds before considering a page timed out"),
        delay: z.number().optional().describe("Number of seconds delay between navigation and screenshotting"),
        threads: z.number().optional().describe("Number of concurrent threads"),
        format: z.enum(["jpeg", "png"]).optional().describe("Screenshot format"),
        write_db: z.boolean().optional().describe("Write results to SQLite database"),
        write_jsonl: z.boolean().optional().describe("Write results as JSON lines")
    },
    async ({
        urls,
        screenshot_path,
        chrome_window_x,
        chrome_window_y,
        timeout,
        delay,
        threads,
        format,
        write_db,
        write_jsonl
    }) => {
        // Validate screenshot_path is not a traversal path
        const safeScreenshotPath = sanitizePath(screenshot_path, process.cwd());

        const urlsFile = join(safeScreenshotPath, 'urls.txt');
        const urlsContent = urls.join('\n');

        try {
            await writeFile(urlsFile, urlsContent);

            const spawnArgs = ["scan", "file", "-f", urlsFile];

            spawnArgs.push("--screenshot-path", safeScreenshotPath);
            if (chrome_window_x) spawnArgs.push("--chrome-window-x", chrome_window_x.toString());
            if (chrome_window_y) spawnArgs.push("--chrome-window-y", chrome_window_y.toString());
            if (timeout) spawnArgs.push("--timeout", timeout.toString());
            if (delay) spawnArgs.push("--delay", delay.toString());
            if (threads) spawnArgs.push("--threads", threads.toString());
            if (format) spawnArgs.push("--screenshot-format", format);
            if (write_db) spawnArgs.push("--write-db");
            if (write_jsonl) spawnArgs.push("--write-jsonl");

            if (!write_db && !write_jsonl) {
                spawnArgs.push("--write-none");
            }

            const result = await secureSpawn(gowitnessPath, spawnArgs);
            const output = result.stdout + result.stderr;

            try { await unlink(urlsFile); } catch { /* ignore cleanup errors */ }

            if (result.exitCode !== 0) {
                throw new Error(`gowitness exited with code ${result.exitCode}:\n${output}`);
            }

            return {
                content: [{
                    type: "text" as const,
                    text: `Batch screenshot completed for ${urls.length} URLs.\nOutput: ${output}\n\nScreenshots saved to: ${safeScreenshotPath}`
                }]
            };
        } catch (error) {
            throw new Error(`Failed to process batch screenshots: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
);

// Tool: Read screenshot file as binary data
server.tool(
    "gowitness-read-binary",
    "Read a screenshot file and return it as binary data",
    {
        file_path: z.string().describe("Path to the screenshot file to read"),
        screenshot_dir: z.string().optional().describe("Directory to search for screenshot files (if file_path is not absolute)"),
    },
    async ({ file_path, screenshot_dir }) => {
        const baseDir = resolve(screenshot_dir || "./screenshots");

        // Validate the file path stays within the screenshot directory
        const fullPath = sanitizePath(file_path, baseDir);

        await access(fullPath);

        const binaryData = await readFile(fullPath);
        const stats = await stat(fullPath);

        return {
            content: [{
                type: "text" as const,
                text: `File read successfully. Binary data size: ${binaryData.length} bytes`
            }],
            binaryData: binaryData.toString('base64'),
            metadata: {
                filename: file_path,
                size: binaryData.length,
                path: fullPath,
                lastModified: stats.mtime.toISOString()
            }
        };
    }
);

// Tool: List screenshot files in directory
server.tool(
    "gowitness-list-screenshots",
    "List all screenshot files in a directory",
    {
        screenshot_dir: z.string().optional().describe("Directory to search for screenshots (default: ./screenshots)"),
    },
    async ({ screenshot_dir = "./screenshots" }) => {
        const safeDir = sanitizePath(screenshot_dir, process.cwd());

        await access(safeDir);
        const files = await readdir(safeDir);

        const imageFiles = files.filter(file =>
            file.endsWith('.jpeg') || file.endsWith('.png') || file.endsWith('.jpg')
        );

        const fileDetails = await Promise.all(
            imageFiles.map(async file => {
                const filePath = join(safeDir, file);
                const stats = await stat(filePath);
                return {
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    created: stats.mtime.toISOString()
                };
            })
        );

        fileDetails.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

        return {
            content: [{
                type: "text" as const,
                text: `Found ${fileDetails.length} screenshot files in ${safeDir}:\n` +
                      fileDetails.map(f => `• ${f.filename} (${f.size} bytes, ${f.created})`).join('\n')
            }],
            files: fileDetails
        };
    }
);


function getHostnameFromUrl(url: string): string {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace(/[^a-zA-Z0-9]/g, '_');
    } catch {
        return 'unknown';
    }
}

// Start the server
async function main() {
    await startServer(server);
    console.error("Enhanced gowitness MCP Server running");
}

main().catch((err) => {
    console.error("Fatal error in main():", err);
    process.exit(1);
});
