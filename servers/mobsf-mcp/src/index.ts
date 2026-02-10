import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createMobSFClient } from './mobsf.js';
import { getEnvOrArg, startServer, TIMEOUT_SCHEMA } from "mcp-shared";

// Get command line arguments — prefer env vars for credentials
const baseUrl = getEnvOrArg("MOBSF_BASE_URL", 2);
const apiKey = getEnvOrArg("MOBSF_API_KEY", 3);

if (!baseUrl || !apiKey) {
    console.error("Usage: mobsf-mcp <baseUrl> <apiKey>");
    console.error("  Or set MOBSF_BASE_URL and MOBSF_API_KEY environment variables");
    process.exit(1);
}

// Create MobSF client
const mobsfClient = createMobSFClient(baseUrl, apiKey);

// Create server instance
const server = new McpServer({
    name: "mobsf",
    version: "1.0.0",
});

function buildRequestOptions(extra: { signal: AbortSignal }, timeoutSeconds?: number) {
    return {
        signal: extra.signal,
        ...(timeoutSeconds && { timeoutMs: timeoutSeconds * 1000 }),
    };
}

// Define the scanFile tool

server.tool(
    "do-mobsf-scan",
    "Scan a file that has already been uploaded to MobSF. This tool analyzes the uploaded mobile application for security vulnerabilities and provides a comprehensive security assessment report.",
    {
        hash: z.string().describe("Hash of the file to scan"),
        reScan: z.boolean().optional().describe("Set to true to force a rescan of the file"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ hash, reScan, timeoutSeconds }, extra) => {
        const result = await mobsfClient.scanFile(hash, reScan, buildRequestOptions(extra, timeoutSeconds));
        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
            }]
        };
    }
);


server.tool(
    "do-mobsf-upload",
    "Upload a mobile application file (APK, IPA, or APPX) to MobSF for security analysis. This is the first step before scanning and must be done prior to using other analysis functions.",
    {
        file: z.string().describe("Upload file path"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ file, timeoutSeconds }, extra) => {
        const result = await mobsfClient.uploadFile(file, buildRequestOptions(extra, timeoutSeconds));
        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
            }]
        };
    }
);


server.tool(
    "do-mobsf-scan-logs",
    "Retrieve detailed scan logs for a previously analyzed mobile application using its hash value. These logs contain information about the scanning process and any issues encountered.",
    {
        hash: z.string().describe("Hash file to getting scan logs"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ hash, timeoutSeconds }, extra) => {
        const result = await mobsfClient.getScanLogs(hash, buildRequestOptions(extra, timeoutSeconds));
        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
            }]
        };
    }
);

server.tool(
    "do-mobsf-json-report",
    "Generate and retrieve a comprehensive security analysis report in JSON format for a scanned mobile application. This report includes detailed findings about security vulnerabilities, permissions, API calls, and other security-relevant information.",
    {
        hash: z.string().describe("Hash file to getting scan logs"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ hash, timeoutSeconds }, extra) => {
        const result = await mobsfClient.generateJsonReport(hash, buildRequestOptions(extra, timeoutSeconds));
        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
            }]
        };
    }
);

server.tool(
    "do-mobsf-recent-scans",
    "Retrieve a list of recently performed security scans on the MobSF server, showing mobile applications that have been analyzed, their statuses, and basic scan information.",
    {
        page: z.number().describe("Page number for result"),
        pageSize: z.number().describe("Page size for result"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ page, pageSize, timeoutSeconds }, extra) => {
        const result = await mobsfClient.getRecentScans(page, pageSize, buildRequestOptions(extra, timeoutSeconds));
        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(result, null, 2),
            }]
        };
    }
);

// Start the server
async function main() {
    await startServer(server);
    console.error("mobsf MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
