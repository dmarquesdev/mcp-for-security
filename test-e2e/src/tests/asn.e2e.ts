import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import {
  assertContains,
  assertMatchesAny,
  assertMatchesRegex,
} from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("ASN mapping", () => {
  describe("asnmap", () => {
    it(`resolves ${TARGETS.CLOUDFLARE_ASN} to CIDR ranges`, { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) { t.skip(skip); return; }
      if (!process.env.PDCP_API_KEY) { t.skip("PDCP_API_KEY not set"); return; }
      if (!(await isServiceHealthy("asnmap"))) { t.skip("asnmap not healthy"); return; }
      const result = await callTool("asnmap", "do-asnmap", {
        asn: TARGETS.CLOUDFLARE_ASN,
      });
      assertContains(result, "/");
      assertMatchesRegex(result, /\d+\.\d+\.\d+\.\d+\/\d+/);
    });

    it(`resolves ${TARGETS.CLOUDFLARE_IP} to ASN info`, { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) { t.skip(skip); return; }
      if (!process.env.PDCP_API_KEY) { t.skip("PDCP_API_KEY not set"); return; }
      if (!(await isServiceHealthy("asnmap"))) { t.skip("asnmap not healthy"); return; }
      const result = await callTool("asnmap", "do-asnmap", {
        ip: TARGETS.CLOUDFLARE_IP,
      });
      assertMatchesAny(result, ["/", "1.1.1"]);
      assertMatchesRegex(result, /\d+\.\d+\.\d+\.\d+/);
    });

    it(`resolves ${TARGETS.CLOUDFLARE_DOMAIN} to network ranges`, { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) { t.skip(skip); return; }
      if (!process.env.PDCP_API_KEY) { t.skip("PDCP_API_KEY not set"); return; }
      if (!(await isServiceHealthy("asnmap"))) { t.skip("asnmap not healthy"); return; }
      const result = await callTool("asnmap", "do-asnmap", {
        domain: TARGETS.CLOUDFLARE_DOMAIN,
      });
      assertContains(result, "/");
      assertMatchesRegex(result, /\d+\.\d+\.\d+\.\d+\/\d+/);
    });

    it(`resolves ${TARGETS.CLOUDFLARE_ORG} org name`, { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) { t.skip(skip); return; }
      if (!process.env.PDCP_API_KEY) { t.skip("PDCP_API_KEY not set"); return; }
      if (!(await isServiceHealthy("asnmap"))) { t.skip("asnmap not healthy"); return; }
      const result = await callTool("asnmap", "do-asnmap", {
        org: TARGETS.CLOUDFLARE_ORG,
      });
      assertMatchesAny(result, ["/", "no results found"]);
    });
  });
});
