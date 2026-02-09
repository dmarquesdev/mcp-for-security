"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const crtsh_js_1 = require("./crtsh.js");
const mcp_shared_1 = require("mcp-shared");
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "crtsh",
    version: "1.0.0",
});
server.tool("crtsh", "Discovers subdomains from SSL certificate logs", {
    target: zod_1.z.string().describe("Target domain to analyze (e.g., example.com)."),
}, async ({ target }) => {
    const domains = await (0, crtsh_js_1.GetCrtSh)(target);
    return {
        content: [{
                type: "text",
                text: JSON.stringify(domains, null, 2)
            }]
    };
});
// Start the server
async function main() {
    await (0, mcp_shared_1.startServer)(server);
    console.error("crtsh MCP Server running");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
