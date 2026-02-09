"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const mcp_shared_1 = require("mcp-shared");
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: arjun-mcp <arjun binary or python3 arjun>");
    process.exit(1);
}
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "arjun",
    version: "1.0.0",
});
server.tool("do-arjun", "Run Arjun to discover hidden HTTP parameters", {
    url: zod_1.z.string().url().describe("Target URL to scan for hidden parameters"),
    textFile: zod_1.z.string().optional().describe("Path to file containing multiple URLs"),
    wordlist: zod_1.z.string().optional().describe("Path to custom wordlist file"),
    method: zod_1.z.enum(["GET", "POST", "JSON", "HEADERS"]).optional().describe("HTTP method to use for scanning (default: GET)"),
    rateLimit: zod_1.z.number().optional().describe("Maximum requests per second (default: 9999)"),
    chunkSize: zod_1.z.number().optional().describe("Chunk size. The number of parameters to be sent at once"),
}, async ({ url, textFile, wordlist, method, rateLimit, chunkSize }) => {
    // Build command arguments
    const arjunArgs = [];
    if (!url && !textFile) {
        throw new Error("url or textfile parameter required");
    }
    if (url) {
        arjunArgs.push('-u', url);
    }
    if (textFile) {
        arjunArgs.push('-f', textFile);
    }
    if (wordlist) {
        arjunArgs.push('-w', wordlist);
    }
    if (method) {
        arjunArgs.push('-m', method);
    }
    if (rateLimit) {
        arjunArgs.push('--rate-limit', rateLimit.toString());
    }
    if (chunkSize) {
        arjunArgs.push('--rate-limit', chunkSize.toString());
    }
    const result = await (0, mcp_shared_1.secureSpawn)(args[0], arjunArgs);
    if (result.exitCode !== 0) {
        return {
            content: [{
                    type: "text",
                    text: (0, mcp_shared_1.removeAnsiCodes)(`arjun exited with code ${result.exitCode}\n${result.stderr}`)
                }]
        };
    }
    return {
        content: [{
                type: "text",
                text: (0, mcp_shared_1.removeAnsiCodes)(result.stdout)
            }]
    };
});
// Start the server
async function main() {
    await (0, mcp_shared_1.startServer)(server);
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
