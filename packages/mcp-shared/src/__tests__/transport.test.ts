import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { startServer } from "../transport.js";

// All tests share a single HTTP server to avoid port conflicts and hanging.
const PORT = 19100 + Math.floor(Math.random() * 900);

/** Helper: make an HTTP request and return status + body + headers. */
function request(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
    return new Promise((resolve, reject) => {
        const payload = body !== undefined ? (typeof body === "string" ? body : JSON.stringify(body)) : undefined;
        const req = http.request(
            {
                hostname: "127.0.0.1",
                port: PORT,
                method,
                path,
                headers: {
                    "Content-Type": "application/json",
                    ...headers,
                    ...(payload ? { "Content-Length": String(Buffer.byteLength(payload)) } : {}),
                },
            },
            (res) => {
                const chunks: Buffer[] = [];
                res.on("data", (c: Buffer) => chunks.push(c));
                res.on("end", () =>
                    resolve({
                        status: res.statusCode!,
                        headers: res.headers,
                        body: Buffer.concat(chunks).toString(),
                    })
                );
            }
        );
        req.on("error", reject);
        if (payload) req.write(payload);
        req.end();
    });
}

describe("transport: HTTP mode", () => {
    let origArgv: string[];

    before(async () => {
        origArgv = [...process.argv];

        const server = new McpServer({ name: "transport-test", version: "1.0.0" });
        server.tool("do-ping", "Ping tool", { msg: z.string() }, async ({ msg }) => ({
            content: [{ type: "text" as const, text: msg }],
        }));

        process.argv.push("--transport", "http", "--port", String(PORT));
        await startServer(server);
        await new Promise((r) => setTimeout(r, 200));

        // Restore argv
        process.argv.length = 0;
        process.argv.push(...origArgv);
    });

    // Force exit after all tests (HTTP server keeps event loop alive)
    after(() => {
        setTimeout(() => process.exit(0), 100);
    });

    it("health check returns 200 with {status: ok}", async () => {
        const res = await request("GET", "/healthz");
        assert.equal(res.status, 200);
        const data = JSON.parse(res.body);
        assert.equal(data.status, "ok");
    });

    it("health check Content-Type is application/json", async () => {
        const res = await request("GET", "/healthz");
        assert.ok(res.headers["content-type"]?.includes("application/json"));
    });

    it("CORS preflight returns 204 with correct headers", async () => {
        const res = await request("OPTIONS", "/mcp");
        assert.equal(res.status, 204);
        assert.ok(res.headers["access-control-allow-origin"]?.includes("*"));
        assert.ok(res.headers["access-control-allow-methods"]?.includes("POST"));
        assert.ok(res.headers["access-control-allow-headers"]?.includes("Mcp-Session-Id"));
    });

    it("CORS preflight includes DELETE in allowed methods", async () => {
        const res = await request("OPTIONS", "/mcp");
        assert.ok(res.headers["access-control-allow-methods"]?.includes("DELETE"));
    });

    it("invalid JSON returns parse error -32700", async () => {
        const res = await request("POST", "/mcp", "not valid json{{{");
        assert.equal(res.status, 400);
        const data = JSON.parse(res.body);
        assert.equal(data.jsonrpc, "2.0");
        assert.equal(data.error.code, -32700);
        assert.equal(data.error.message, "Parse error");
        assert.equal(data.id, null);
    });

    it("request without session or initialize returns 400", async () => {
        const res = await request("POST", "/mcp", {
            jsonrpc: "2.0",
            method: "tools/list",
            id: 1,
        });
        assert.equal(res.status, 400);
        const data = JSON.parse(res.body);
        assert.equal(data.error.code, -32000);
        assert.ok(data.error.message.includes("No active session"));
    });

    it("CORS header is added to non-preflight responses", async () => {
        const res = await request("POST", "/mcp", {
            jsonrpc: "2.0",
            method: "tools/list",
            id: 1,
        });
        assert.equal(res.headers["access-control-allow-origin"], "*");
    });
});
