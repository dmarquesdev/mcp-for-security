import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertNotEmpty } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";
import { ensureDvwaSetup } from "../helpers/dvwa-setup.js";

describe("injection testing tools", () => {
  describe("sqlmap", () => {
    it("runs against DVWA", { timeout: 120000 }, async () => {
      const skip = await shouldSkip(TestCategory.VULN_DVWA);
      if (skip) return;
      if (!(await isServiceHealthy("sqlmap"))) return;
      await ensureDvwaSetup();
      const result = await callTool("sqlmap", "do-sqlmap", {
        target: TARGETS.DVWA,
        args: ["--batch"],
      });
      assertNotEmpty(result);
    });
  });

  describe("commix", () => {
    it("runs against DVWA", { timeout: 120000 }, async () => {
      const skip = await shouldSkip(TestCategory.VULN_DVWA);
      if (skip) return;
      if (!(await isServiceHealthy("commix"))) return;
      await ensureDvwaSetup();
      const result = await callTool("commix", "do-commix", {
        target: TARGETS.DVWA,
        args: ["--batch"],
      });
      assertNotEmpty(result);
    });
  });
});
