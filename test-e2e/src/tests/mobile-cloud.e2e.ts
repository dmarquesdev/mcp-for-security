import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertNotEmpty } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";

describe("mobile and cloud tools", () => {
  describe("mobsf", () => {
    it("queries MobSF API (credential required)", { timeout: 30000 }, async () => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) return;
      if (!process.env.MOBSF_API_KEY) return;
      if (!(await isServiceHealthy("mobsf"))) return;
      const result = await callTool("mobsf", "do-mobsf-recent-scans", {});
      assertNotEmpty(result);
    });
  });

  describe("scoutsuite", () => {
    it("runs ScoutSuite (credential required)", { timeout: 30000 }, async () => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) return;
      // ScoutSuite needs cloud provider credentials
      if (!process.env.AWS_ACCESS_KEY_ID) return;
      if (!(await isServiceHealthy("scoutsuite"))) return;
      const result = await callTool("scoutsuite", "do-scoutsuite", {
        provider: "aws",
        args: [],
      });
      assertNotEmpty(result);
    });
  });
});
