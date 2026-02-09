"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const zod_1 = require("zod");
const mcp_shared_1 = require("mcp-shared");
const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: httpx-mcp <httpx binary>");
    process.exit(1);
}
// Create server instance
const server = new mcp_js_1.McpServer({
    name: "httpx",
    version: "1.0.0",
});
server.tool("httpx", "Scans the given target domains and detects active HTTP/HTTPS services on ports like 80 and 443.", {
    target: zod_1.z.array(zod_1.z.string()).describe("A list of domain names (e.g., example.com) to scan for HTTP and HTTPS services."),
    ports: zod_1.z.array(zod_1.z.number()).optional().describe(""),
    probes: zod_1.z.array(zod_1.z.string()).optional().describe(`Available probe options:
            status-code      Display response status-code
            content-length   Display response content-length
            content-type     Display response content-type
            location         Display response redirect location
            favicon          Display mmh3 hash for '/favicon.ico' file
            hash             Display response body hash (supported: md5,mmh3,simhash,sha1,sha256,sha512)
            jarm             Display jarm fingerprint hash
            response-time    Display response time
            line-count       Display response body line count
            word-count       Display response body word count
            title            Display page title
            body-preview     Display first N characters of response body (default 100)
            web-server       Display server name
            tech-detect      Display technology in use based on wappalyzer dataset
            method           Display http request method
            websocket        Display server using websocket
            ip               Display host ip
            cname            Display host cname
            extract-fqdn     Get domain and subdomains from response body and header
            asn              Display host asn information
            cdn              Display cdn/waf in use (default true)
            probe            Display probe status`)
}, async ({ target, ports, probes }) => {
    const httpxArgs = ["-u", target.join(","), "-silent"];
    if (ports && ports.length > 0) {
        httpxArgs.push("-p", ports.join(","));
    }
    if (probes && probes.length > 0) {
        for (const probe of probes) {
            httpxArgs.push(`-${probe}`);
        }
    }
    const result = await (0, mcp_shared_1.secureSpawn)(args[0], httpxArgs);
    if (result.exitCode !== 0) {
        throw new Error(`httpx exited with code ${result.exitCode}:\n${result.stderr}`);
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
    console.error("httpx MCP Server running");
}
main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
