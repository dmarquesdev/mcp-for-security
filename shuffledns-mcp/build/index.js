"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const mcp_shared_1 = require("mcp-shared");
const args = process.argv.slice(2);
if (args.length < 2) {
    console.error("Usage: shuffledns-mcp <shuffledns binary> <massdns binary>");
    process.exit(1);
}
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "shuffledns",
    version: "1.0.0",
});
server.tool("shuffledns", "DNS Brute force", {
    target: zod_1.z.string().describe("A list of domain names (e.g., example.com) to scan for HTTP and HTTPS services."),
    resolver: zod_1.z.string().describe("Resolver file path"),
    mode: zod_1.z.enum(["bruteforce", "resolve", "filter"]).describe("Mode"),
    wordlist: zod_1.z.string().describe("wordlist"),
    rateLimit: zod_1.z.number().optional().describe("ratelimit")
}, async ({ target, resolver, mode, wordlist, rateLimit }) => {
    const shufflednsArgs = ["-d", target, "-r", resolver, "-mode", mode, "-w", wordlist, "-m", args[1], "-silent"];
    if (rateLimit) {
        shufflednsArgs.push("-t", rateLimit.toString());
    }
    const result = await (0, mcp_shared_1.secureSpawn)(args[0], shufflednsArgs);
    if (result.exitCode !== 0) {
        throw new Error(`shuffledns exited with code ${result.exitCode}:\n${result.stderr}`);
    }
    return {
        content: [{
                type: "text",
                text: result.stdout
            }]
    };
});
// Start the server
async function main() {
    await (0, mcp_shared_1.startServer)(server);
    console.error("shuffledns MCP Server running");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
