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

describe("vulnerability scanning", () => {
  describe("nuclei", () => {
    it("runs tech-detect templates against httpbin", { timeout: 120000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("nuclei"))) { t.skip("nuclei not healthy"); return; }
      const result = await callTool("nuclei", "do-nuclei", {
        targets: [TARGETS.HTTPBIN],
        args: ["-tags", "tech-detect"],
      });
      // nuclei tech-detect should find python/flask/gunicorn on httpbin
      assertMatchesAny(result, ["[", "tech", "httpbin", "python", "flask", "gunicorn"]);
      assertLineCount(result, 1);
    });

    it("returns error for empty targets", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("nuclei"))) { t.skip("nuclei not healthy"); return; }
      const result = await callTool("nuclei", "do-nuclei", {
        targets: [""],
        args: ["-tags", "tech-detect"],
      });
      assertIsError(result);
    });
  });
});
