import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import {
  assertIsError,
  assertLineCount,
  assertMatchesAny,
  assertMatchesRegex,
} from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("screenshot tools", () => {
  describe("gowitness", () => {
    it("screenshots httpbin and returns result", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("gowitness"))) { t.skip("gowitness not healthy"); return; }
      const result = await callTool("gowitness", "do-gowitness-screenshot", {
        url: TARGETS.HTTPBIN,
      });
      assertMatchesAny(result, ["screenshot", "http", "httpbin", "scan", "saved", "png"]);
      assertLineCount(result, 1);
    });

    it("returns error for empty URL", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("gowitness"))) { t.skip("gowitness not healthy"); return; }
      const result = await callTool("gowitness", "do-gowitness-screenshot", {
        url: "",
      });
      assertIsError(result);
    });
  });
});
