import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertNotEmpty } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";

describe("mobile and cloud tools", () => {
  describe("mobsf", () => {
    it("queries MobSF API (credential required)", { timeout: 30000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) { t.skip(skip); return; }
      if (!process.env.MOBSF_API_KEY) { t.skip("MOBSF_API_KEY not set"); return; }
      if (!(await isServiceHealthy("mobsf"))) { t.skip("mobsf not healthy"); return; }
      const result = await callTool("mobsf", "do-mobsf-recent-scans", {});
      assertNotEmpty(result);
    });
  });

  describe("scoutsuite", () => {
    it("runs ScoutSuite (credential required)", { timeout: 30000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) { t.skip(skip); return; }
      if (!process.env.AWS_ACCESS_KEY_ID) { t.skip("AWS_ACCESS_KEY_ID not set"); return; }
      if (!(await isServiceHealthy("scoutsuite"))) { t.skip("scoutsuite not healthy"); return; }
      const result = await callTool("scoutsuite", "do-scoutsuite", {
        provider: "aws",
        args: [],
      });
      assertNotEmpty(result);
    });
  });
});
