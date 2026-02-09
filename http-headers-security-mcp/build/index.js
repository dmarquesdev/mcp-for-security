"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const owasp_headers_remove_json_1 = __importDefault(require("./owasp_headers_remove.json"));
const owasp_headers_add_json_1 = __importDefault(require("./owasp_headers_add.json"));
const mcp_shared_1 = require("mcp-shared");
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "http-headers-security",
    version: "1.0.0",
});
async function fetchHttpHeaders(target) {
    try {
        const response = await axios_1.default.get(target, {
            timeout: 100000,
            validateStatus: () => true // Accept all status codes
        });
        return Object.entries(response.headers).map(([key, value]) => `${key}: ${value}`);
    }
    catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to fetch headers: ${error.message}`);
        }
        throw new Error('Failed to fetch headers: Unknown error occurred');
    }
}
async function findMatchingRemoveHeaders(headers) {
    const removeHeaders = owasp_headers_remove_json_1.default.headers;
    return headers.filter(header => {
        const headerName = header.split(':')[0].trim().toLowerCase();
        return removeHeaders.some(h => h.toLowerCase() === headerName);
    });
}
async function findMatchingAddedHeaders(headers) {
    const addHeaders = owasp_headers_add_json_1.default.headers;
    const existingHeaderNames = headers.map(header => header.split(':')[0].trim().toLowerCase());
    return addHeaders
        .filter(header => !existingHeaderNames.includes(header.name.toLowerCase()))
        .map(header => `${header.name}: ${header.value}`);
}
server.tool("analyze-http-header", "Perform security analysis of HTTP response headers for a web application. This tool examines HTTP headers against OWASP security best practices, identifying both potentially dangerous headers that should be removed and recommended security headers that are missing. Results include specific recommendations for improving security posture.", {
    target: zod_1.z.string().describe("Target URL to analyze (e.g., https://example.com). The tool will make a request to this URL and evaluate its HTTP response headers for security issues."),
}, async ({ target }) => {
    const headers = await fetchHttpHeaders(target);
    const removeHeaders = await findMatchingRemoveHeaders(headers);
    const addedHeaders = await findMatchingAddedHeaders(headers);
    const result = {
        removeHeaders: removeHeaders.length > 0 ? removeHeaders : ["No headers to remove"],
        addedHeaders: addedHeaders.length > 0 ? addedHeaders : ["No headers to add"]
    };
    return {
        content: [{
                type: "text",
                text: JSON.stringify(result, null, 2)
            }]
    };
});
// Start the server
async function main() {
    await (0, mcp_shared_1.startServer)(server);
    console.error("http-headers-security MCP Server running");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
