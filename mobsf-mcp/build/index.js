"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const mobsf_js_1 = require("./mobsf.js");
const mcp_shared_1 = require("mcp-shared");
// Get command line arguments — prefer env vars for credentials
const baseUrl = (0, mcp_shared_1.getEnvOrArg)("MOBSF_BASE_URL", 2);
const apiKey = (0, mcp_shared_1.getEnvOrArg)("MOBSF_API_KEY", 3);
if (!baseUrl || !apiKey) {
    console.error("Usage: mobsf-mcp <baseUrl> <apiKey>");
    console.error("  Or set MOBSF_BASE_URL and MOBSF_API_KEY environment variables");
    process.exit(1);
}
// Create MobSF client
const mobsfClient = (0, mobsf_js_1.createMobSFClient)(baseUrl, apiKey);
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "mobsf",
    version: "1.0.0",
});
// Define the scanFile tool
server.tool("scanFile", "Scan a file that has already been uploaded to MobSF. This tool analyzes the uploaded mobile application for security vulnerabilities and provides a comprehensive security assessment report.", {
    hash: zod_1.z.string().describe("Hash of the file to scan"),
    reScan: zod_1.z.boolean().optional().describe("Set to true to force a rescan of the file")
}, async ({ hash, reScan }) => {
    const result = await mobsfClient.scanFile(hash, reScan);
    return {
        content: [{
                type: "text",
                text: JSON.stringify(result, null, 2),
            }]
    };
});
server.tool("uploadFile", "Upload a mobile application file (APK, IPA, or APPX) to MobSF for security analysis. This is the first step before scanning and must be done prior to using other analysis functions.", {
    file: zod_1.z.string().describe("Upload file path"),
}, async ({ file }) => {
    const result = await mobsfClient.uploadFile(file);
    return {
        content: [{
                type: "text",
                text: JSON.stringify(result, null, 2),
            }]
    };
});
server.tool("getScanLogs", "Retrieve detailed scan logs for a previously analyzed mobile application using its hash value. These logs contain information about the scanning process and any issues encountered.", {
    hash: zod_1.z.string().describe("Hash file to getting scan logs"),
}, async ({ hash }) => {
    const result = await mobsfClient.getScanLogs(hash);
    return {
        content: [{
                type: "text",
                text: JSON.stringify(result, null, 2),
            }]
    };
});
server.tool("getJsonReport", "Generate and retrieve a comprehensive security analysis report in JSON format for a scanned mobile application. This report includes detailed findings about security vulnerabilities, permissions, API calls, and other security-relevant information.", {
    hash: zod_1.z.string().describe("Hash file to getting scan logs"),
}, async ({ hash }) => {
    const result = await mobsfClient.generateJsonReport(hash);
    return {
        content: [{
                type: "text",
                text: JSON.stringify(result, null, 2),
            }]
    };
});
server.tool("getRecentScans", "Retrieve a list of recently performed security scans on the MobSF server, showing mobile applications that have been analyzed, their statuses, and basic scan information.", {
    page: zod_1.z.number().describe("Page number for result"),
    pageSize: zod_1.z.number().describe("Page size for result"),
}, async ({ page, pageSize }) => {
    const result = await mobsfClient.getRecentScans(page, pageSize);
    return {
        content: [{
                type: "text",
                text: JSON.stringify(result, null, 2),
            }]
    };
});
// Start the server
async function main() {
    await (0, mcp_shared_1.startServer)(server);
    console.error("mobsf MCP Server running");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
