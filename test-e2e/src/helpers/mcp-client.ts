import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const GATEWAY = process.env.E2E_GATEWAY_URL || "http://localhost:8000";

export async function createE2EClient(serviceName: string): Promise<{
  client: Client;
  cleanup: () => Promise<void>;
}> {
  const url = new URL(`${GATEWAY}/${serviceName}/mcp`);
  const transport = new StreamableHTTPClientTransport(url);
  const client = new Client({ name: `e2e-${serviceName}`, version: "1.0.0" });
  await client.connect(transport);
  return {
    client,
    cleanup: async () => {
      await client.close();
    },
  };
}

export async function callTool(
  service: string,
  tool: string,
  args: Record<string, unknown>,
  options?: { requestTimeout?: number },
): Promise<Awaited<ReturnType<Client["callTool"]>>> {
  const { client, cleanup } = await createE2EClient(service);
  try {
    return await client.callTool(
      { name: tool, arguments: args },
      undefined,
      options?.requestTimeout ? { timeout: options.requestTimeout } : undefined,
    );
  } finally {
    await cleanup();
  }
}
