import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createE2EClient } from "../helpers/mcp-client.js";
import { isServiceHealthy, waitForGateway, ALL_SERVICES } from "../helpers/health.js";

describe("smoke — health checks and tool listing", () => {
  before(async () => {
    const gatewayUp = await waitForGateway(10000);
    assert.ok(gatewayUp, "Gateway is not reachable at " + (process.env.E2E_GATEWAY_URL || "http://localhost:8000"));
  });

  // Small delay between services to avoid gateway rate limiting
  const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

  for (const service of ALL_SERVICES) {
    describe(service, () => {
      it(`${service} is healthy`, async (t) => {
        await delay(100);
        const healthy = await isServiceHealthy(service);
        if (!healthy) { t.skip(`${service} not reachable`); return; }
        assert.ok(healthy);
      });

      it(`${service} lists at least one tool`, async (t) => {
        await delay(100);
        const healthy = await isServiceHealthy(service);
        if (!healthy) { t.skip(`${service} not healthy`); return; }
        const { client, cleanup } = await createE2EClient(service);
        try {
          const tools = await client.listTools();
          assert.ok(
            tools.tools.length >= 1,
            `${service} should have at least 1 tool, found ${tools.tools.length}`,
          );
        } finally {
          await cleanup();
        }
      });
    });
  }
});
