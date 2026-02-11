import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertContains } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("network scanners", () => {
  describe("nmap", () => {
    it("scans scanme.nmap.org and finds open ports", { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("nmap"))) { t.skip("nmap not healthy"); return; }
      const result = await callTool("nmap", "do-nmap", {
        target: TARGETS.NMAP_SCANME,
        nmap_args: ["-T4", "--top-ports", "100"],
      });
      assertContains(result, "open");
    });
  });

  describe("masscan", () => {
    it("skipped — requires privileged mode", { timeout: 5000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PRIVILEGED);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("masscan"))) { t.skip("masscan not healthy"); return; }
      const result = await callTool("masscan", "do-masscan", {
        target: TARGETS.NMAP_SCANME,
        args: ["-p80", "--rate", "100"],
      });
      assertContains(result, "open");
    });
  });
});
