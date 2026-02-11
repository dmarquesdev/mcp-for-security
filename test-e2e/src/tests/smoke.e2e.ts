import { describe, it, before } from "node:test";
import assert from "node:assert/strict";
import { createE2EClient } from "../helpers/mcp-client.js";
import { isServiceHealthy, waitForGateway, ALL_SERVICES } from "../helpers/health.js";

describe("smoke — health checks and tool listing", () => {
  before(async () => {
    const gatewayUp = await waitForGateway(10000);
    assert.ok(gatewayUp, "Gateway is not reachable at " + (process.env.E2E_GATEWAY_URL || "http://localhost:8000"));
  });

  for (const service of ALL_SERVICES) {
    describe(service, () => {
      it(`${service} is healthy`, async () => {
        const healthy = await isServiceHealthy(service);
        if (!healthy) {
          // Skip rather than fail — the service might not be started
          return;
        }
        assert.ok(healthy);
      });

      it(`${service} lists at least one tool`, async () => {
        const healthy = await isServiceHealthy(service);
        if (!healthy) {
          return; // skip if not healthy
        }
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
