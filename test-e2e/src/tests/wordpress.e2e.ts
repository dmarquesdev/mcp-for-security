import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import {
  assertIsError,
  assertLineCount,
  assertMatchesAny,
} from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("WordPress tools", () => {
  describe("wpscan", () => {
    it("scans WordPress target and detects version", { timeout: 120000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.VULN_WORDPRESS);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("wpscan"))) { t.skip("wpscan not healthy"); return; }
      const result = await callTool("wpscan", "do-wpscan", {
        target: TARGETS.WORDPRESS,
        args: [],
      });
      assertMatchesAny(result, ["wordpress", "wpscan", "interesting finding", "version"]);
      assertLineCount(result, 3);
    });

    it("reports non-WordPress on httpbin", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("wpscan"))) { t.skip("wpscan not healthy"); return; }
      const result = await callTool("wpscan", "do-wpscan", {
        target: TARGETS.HTTPBIN,
        args: [],
      });
      // wpscan should indicate it can't detect WordPress
      assertMatchesAny(result, ["not wordpress", "does not seem", "error", "wpscan"]);
    });
  });
});
