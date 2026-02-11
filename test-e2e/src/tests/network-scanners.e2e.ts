import { describe, it, before } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertContains } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("network scanners", () => {
  describe("nmap", () => {
    before(async () => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) return;
      const healthy = await isServiceHealthy("nmap");
      if (!healthy) throw new Error("nmap service not healthy");
    });

    it("scans scanme.nmap.org and finds open ports", { timeout: 90000 }, async () => {
      if (!(await isServiceHealthy("nmap"))) return;
      const result = await callTool("nmap", "do-nmap", {
        target: TARGETS.NMAP_SCANME,
        nmap_args: ["-T4", "--top-ports", "100"],
      });
      assertContains(result, "open");
    });
  });

  describe("masscan", () => {
    it("skipped — requires privileged mode", { timeout: 5000 }, async () => {
      const skip = await shouldSkip(TestCategory.PRIVILEGED);
      if (skip) return;
      // If privileged mode is enabled, run a basic scan
      if (!(await isServiceHealthy("masscan"))) return;
      const result = await callTool("masscan", "do-masscan", {
        target: TARGETS.NMAP_SCANME,
        args: ["-p80", "--rate", "100"],
      });
      assertContains(result, "open");
    });
  });
});
