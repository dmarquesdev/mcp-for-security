"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const mcp_shared_1 = require("mcp-shared");
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: assetfinder-mcp <assetfinder binary>");
    process.exit(1);
}
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "assetfinder",
    version: "1.0.0",
});
server.tool("do-assetfinder", "Find related domains and subdomains using assetfinder for a given target.", {
    target: zod_1.z.string().describe("The root domain (e.g., example.com) to discover associated subdomains and related domains."),
}, async ({ target }) => {
    const assetfinderArgs = ["-subs-only", target];
    const result = await (0, mcp_shared_1.secureSpawn)(args[0], assetfinderArgs);
    if (result.exitCode !== 0) {
        throw new Error(`assetfinder exited with code ${result.exitCode}:\n${result.stderr}`);
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
    console.error("assetfinder MCP Server running");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
