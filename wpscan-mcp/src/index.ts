import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult } from "mcp-shared";

const args = getToolArgs("wpscan-mcp <wpscan binary>");

const server = new McpServer({
    name: "wpscan",
    version: "1.0.0",
});

server.tool(
    "do-wpscan",
    "Run wpscan to analyze WordPress websites for security issues",
    {
        url: z.string().url().describe("The target WordPress website URL to scan"),
        detection_mode: z.enum(["mixed", "passive", "aggressive"]).optional().describe("Scan detection mode"),
        random_user_agent: z.boolean().optional().describe("Enable random user agent rotation"),
        max_threads: z.number().optional().describe("Maximum concurrent scanning threads (default 5)"),
        disable_tls_checks: z.boolean().optional().describe("Disable SSL/TLS certificate verification"),
        proxy: z.string().optional().describe("Proxy server (e.g., http://127.0.0.1:8080)"),
        cookies: z.string().optional().describe("Custom cookies (format: name1=value1; name2=value2)"),
        force: z.boolean().optional().describe("Skip WordPress detection checks"),
        enumerate: z.array(z.enum(["vp", "ap", "p", "vt", "at", "t", "tt", "cb", "dbe"])).describe("WordPress enumeration options: vp (vulnerable plugins), ap (all plugins), p (popular plugins), vt/at/t (themes), tt (timthumbs), cb (config backups), dbe (db exports)"),
    },
    async ({ url, detection_mode, random_user_agent, max_threads, disable_tls_checks, proxy, cookies, force, enumerate }) => {
        const wpscanArgs = ['-u', url];
        if (detection_mode) wpscanArgs.push('--detection-mode', detection_mode);
        if (random_user_agent) wpscanArgs.push('--random-user-agent');
        if (max_threads) wpscanArgs.push('-t', max_threads.toString());
        if (disable_tls_checks) wpscanArgs.push('--disable-tls-checks');
        if (proxy) wpscanArgs.push('--proxy', proxy);
        if (cookies) wpscanArgs.push('--cookie-string', cookies);
        if (force) wpscanArgs.push('--force');
        if (enumerate && enumerate.length > 0) wpscanArgs.push('-e', enumerate.join(','));

        const result = await secureSpawn(args[0], wpscanArgs);
        return formatToolResult(result, { toolName: "wpscan", includeStderr: true });
    },
);

async function main() {
    await startServer(server);
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
