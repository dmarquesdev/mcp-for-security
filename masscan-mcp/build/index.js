"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const mcp_shared_1 = require("mcp-shared");
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: masscan <masscan binary>");
    process.exit(1);
}
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "masscan",
    version: "1.0.0",
});
server.tool("do-masscan", "Run masscan with specified target MASSCAN is a fast port scanner. The primary input parameters are the IP addresses/ranges you want to scan, and the port numbers.", {
    target: zod_1.z.string().describe(`Target information. Example: 1.1.1.1
            1.1.1.1
            `),
    port: zod_1.z.string().describe(`Target port. Example: 1234
               0-65535
                `),
    masscan_args: zod_1.z.array(zod_1.z.string()).describe(`Additional masscan arguments 
            --max-rate 
            `),
}, async ({ target, port, masscan_args }) => {
    const result = await (0, mcp_shared_1.secureSpawn)(args[0], ["-p" + port, target, ...masscan_args]);
    if (result.exitCode !== 0) {
        throw new Error(`masscan exited with code ${result.exitCode}:\n${result.stderr}`);
    }
    return {
        content: [{
                type: "text",
                text: (result.stdout + result.stderr) || "No output from masscan."
            }]
    };
});
async function main() {
    await (0, mcp_shared_1.startServer)(server);
    console.error("masscan MCP Server running");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
