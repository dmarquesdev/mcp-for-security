import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

function parseArg(name: string): string | null {
    const eqForm = process.argv.find((a) => a.startsWith(`--${name}=`));
    if (eqForm) return eqForm.split("=")[1];

    const idx = process.argv.indexOf(`--${name}`);
    if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];

    return null;
}

export interface StartServerOptions {
    defaultPort?: number;
}

export async function startServer(
    server: McpServer,
    opts?: StartServerOptions
): Promise<void> {
    const transportArg = parseArg("transport") || "stdio";

    if (transportArg === "http" || transportArg === "sse") {
        const { StreamableHTTPServerTransport } = await import(
            "@modelcontextprotocol/sdk/server/streamableHttp.js"
        );
        const { createServer } = await import("node:http");
        const { randomUUID } = await import("node:crypto");

        const port = parseInt(parseArg("port") || "") || opts?.defaultPort || 3000;

        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: () => randomUUID(),
        });

        await server.connect(transport);

        const httpServer = createServer(async (req, res) => {
            const url = new URL(req.url || "/", `http://localhost:${port}`);

            // Health check endpoint (bypasses MCP transport)
            if (url.pathname === "/healthz") {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ status: "ok" }));
                return;
            }

            // CORS preflight
            if (req.method === "OPTIONS") {
                res.writeHead(204, {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type, Accept, Mcp-Session-Id",
                });
                res.end();
                return;
            }

            // Add CORS headers to all responses
            res.setHeader("Access-Control-Allow-Origin", "*");

            await transport.handleRequest(req, res);
        });

        httpServer.listen(port);

        // Graceful shutdown
        const shutdown = () => {
            console.error("Shutting down...");
            httpServer.close(() => process.exit(0));
            setTimeout(() => process.exit(1), 5000);
        };
        process.on("SIGTERM", shutdown);
        process.on("SIGINT", shutdown);

        console.error(`MCP Server running on HTTP port ${port}`);
    } else {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("MCP Server running on stdio");
    }
}
