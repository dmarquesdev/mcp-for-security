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

    if (transportArg === "http") {
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

        createServer(async (req, res) => {
            await transport.handleRequest(req, res);
        }).listen(port);

        console.error(`MCP Server running on HTTP port ${port}`);
    } else {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("MCP Server running on stdio");
    }
}
