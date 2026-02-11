import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertNotEmpty } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("screenshot tools", () => {
  describe("gowitness", () => {
    it(`screenshots ${TARGETS.EXAMPLE_HTTPS}`, { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("gowitness"))) { t.skip("gowitness not healthy"); return; }
      const result = await callTool("gowitness", "do-gowitness", {
        target: TARGETS.EXAMPLE_HTTPS,
        args: [],
      });
      assertNotEmpty(result);
    });
  });
});
