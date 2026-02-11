import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { IncomingMessage } from "node:http";

function parseArg(name: string): string | null {
    const eqForm = process.argv.find((a) => a.startsWith(`--${name}=`));
    if (eqForm) return eqForm.split("=")[1];

    const idx = process.argv.indexOf(`--${name}`);
    if (idx !== -1 && idx + 1 < process.argv.length) return process.argv[idx + 1];

    return null;
}

function readRequestBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        req.on("data", (chunk: Buffer) => chunks.push(chunk));
        req.on("end", () => resolve(Buffer.concat(chunks).toString()));
        req.on("error", reject);
    });
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

        // Session map: sessionId → transport
        const sessions = new Map<string, InstanceType<typeof StreamableHTTPServerTransport>>();

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

            // Route existing session by header
            const sessionId = req.headers["mcp-session-id"] as string | undefined;
            if (sessionId && sessions.has(sessionId)) {
                await sessions.get(sessionId)!.handleRequest(req, res);
                return;
            }

            // New session: read body, check for initialize
            if (req.method === "POST") {
                const bodyStr = await readRequestBody(req);
                let body: unknown;
                try {
                    body = JSON.parse(bodyStr);
                } catch {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({
                        jsonrpc: "2.0",
                        error: { code: -32700, message: "Parse error" },
                        id: null,
                    }));
                    return;
                }

                const messages = Array.isArray(body) ? body : [body];
                const isInit = messages.some(
                    (m: unknown) =>
                        m !== null &&
                        typeof m === "object" &&
                        (m as Record<string, unknown>).method === "initialize"
                );

                if (isInit) {
                    // Close any existing session so server.connect() works
                    // (Protocol.connect() throws if _transport is still set)
                    for (const [sid, oldTransport] of sessions) {
                        await oldTransport.close();
                        sessions.delete(sid);
                    }

                    const transport = new StreamableHTTPServerTransport({
                        sessionIdGenerator: () => randomUUID(),
                        onsessioninitialized: (sid: string) => {
                            sessions.set(sid, transport);
                        },
                        onsessionclosed: (sid: string) => {
                            sessions.delete(sid);
                        },
                    });

                    await server.connect(transport);
                    await transport.handleRequest(req, res, body);
                    return;
                }
            }

            // No valid session, not an initialize request
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
                jsonrpc: "2.0",
                error: { code: -32000, message: "Bad Request: No active session" },
                id: null,
            }));
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
