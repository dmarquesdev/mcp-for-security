"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const mcp_shared_1 = require("mcp-shared");
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: waybackurls-mcp <waybackurls binary>");
    process.exit(1);
}
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "waybackurls",
    version: "1.0.0",
});
server.tool("do-waybackurls", "Execute Waybackurls, a tool that fetches known URLs from the Wayback Machine archive for a given domain. This helps in discovering historical endpoints, forgotten API paths, and potentially vulnerable URLs that might not be directly accessible or linked from the current version of the website.", {
    target: zod_1.z.string().url().describe("Target domain to retrieve historical URLs from the Wayback Machine (e.g., example.com)"),
    noSub: zod_1.z.boolean().nullable().describe("When set to true, only retrieves URLs from the exact domain specified, excluding all subdomains"),
}, async ({ target, noSub }) => {
    const waybackurlsArgs = [target, ...(noSub ? ['--no-subs'] : [])];
    const result = await (0, mcp_shared_1.secureSpawn)(args[0], waybackurlsArgs);
    if (result.exitCode !== 0) {
        return {
            content: [{
                    type: "text",
                    text: `waybackurls exited with code ${result.exitCode}\n${result.stderr}`
                }]
        };
    }
    return {
        content: [{
                type: "text",
                text: result.stdout + "\n waybackurls completed successfully"
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
