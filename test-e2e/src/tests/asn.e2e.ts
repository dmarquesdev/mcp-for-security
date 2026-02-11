import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertNotEmpty } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";

describe("ASN mapping", () => {
  describe("asnmap", () => {
    it("resolves ASN to CIDR ranges", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) { t.skip(skip); return; }
      if (!process.env.PDCP_API_KEY) { t.skip("PDCP_API_KEY not set"); return; }
      if (!(await isServiceHealthy("asnmap"))) { t.skip("asnmap not healthy"); return; }
      const result = await callTool("asnmap", "do-asnmap", {
        asn: "AS13335",
      });
      assertNotEmpty(result);
    });

    it("resolves IP to ASN info", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) { t.skip(skip); return; }
      if (!process.env.PDCP_API_KEY) { t.skip("PDCP_API_KEY not set"); return; }
      if (!(await isServiceHealthy("asnmap"))) { t.skip("asnmap not healthy"); return; }
      const result = await callTool("asnmap", "do-asnmap", {
        ip: "1.1.1.1",
      });
      assertNotEmpty(result);
    });

    it("resolves domain to network ranges", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) { t.skip(skip); return; }
      if (!process.env.PDCP_API_KEY) { t.skip("PDCP_API_KEY not set"); return; }
      if (!(await isServiceHealthy("asnmap"))) { t.skip("asnmap not healthy"); return; }
      const result = await callTool("asnmap", "do-asnmap", {
        domain: "cloudflare.com",
      });
      assertNotEmpty(result);
    });

    it("resolves org name", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) { t.skip(skip); return; }
      if (!process.env.PDCP_API_KEY) { t.skip("PDCP_API_KEY not set"); return; }
      if (!(await isServiceHealthy("asnmap"))) { t.skip("asnmap not healthy"); return; }
      const result = await callTool("asnmap", "do-asnmap", {
        org: "Cloudflare",
      });
      assertNotEmpty(result);
    });
  });
});
