import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertNotEmpty } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("vulnerability scanning", () => {
  describe("nuclei", () => {
    it(`runs tech-detect templates against ${TARGETS.EXAMPLE_HTTPS}`, { timeout: 120000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("nuclei"))) { t.skip("nuclei not healthy"); return; }
      const result = await callTool("nuclei", "do-nuclei", {
        targets: [TARGETS.EXAMPLE_HTTPS],
        args: ["-tags", "tech-detect"],
      });
      assertNotEmpty(result);
    });
  });
});
