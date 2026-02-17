import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import {
  assertContains,
  assertIsError,
  assertLineCount,
  assertMatchesRegex,
} from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("domain permutation", () => {
  describe("alterx", () => {
    it(`generates permutations for ${TARGETS.PERMUTATION_DOMAIN}`, { timeout: 30000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.SELF_CONTAINED);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("alterx"))) { t.skip("alterx not healthy"); return; }
      const result = await callTool("alterx", "do-alterx", {
        domain: TARGETS.PERMUTATION_DOMAIN,
        pattern: "{{word}}.{{suffix}}",
      });
      assertContains(result, TARGETS.PERMUTATION_BASE);
      assertLineCount(result, 1);
      const baseEscaped = TARGETS.PERMUTATION_BASE.replace(/\./g, "\\.");
      assertMatchesRegex(result, new RegExp(`[\\w.-]+\\.${baseEscaped}`));
    });

    it("returns error for empty domain", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("alterx"))) { t.skip("alterx not healthy"); return; }
      const result = await callTool("alterx", "do-alterx", {
        domain: "",
        pattern: "{{word}}.{{suffix}}",
      });
      assertIsError(result);
    });
  });
});
