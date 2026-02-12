import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertMatchesAny } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";
import { ensureDvwaSetup } from "../helpers/dvwa-setup.js";

describe("injection testing tools", () => {
  describe("sqlmap", () => {
    it("runs against DVWA", { timeout: 120000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.VULN_DVWA);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("sqlmap"))) { t.skip("sqlmap not healthy"); return; }
      await ensureDvwaSetup();
      const result = await callTool("sqlmap", "do-sqlmap", {
        target: TARGETS.DVWA,
        args: ["--batch"],
      });
      assertMatchesAny(result, ["sqlmap", "http", "target url"]);
    });
  });

  describe("commix", () => {
    it("runs against DVWA", { timeout: 120000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.VULN_DVWA);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("commix"))) { t.skip("commix not healthy"); return; }
      await ensureDvwaSetup();
      const result = await callTool("commix", "do-commix", {
        target: TARGETS.DVWA,
        args: ["--batch"],
      });
      assertMatchesAny(result, ["commix", "http", "injection"]);
    });
  });
});
