import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertNotEmpty } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS, WORDLISTS } from "../helpers/targets.js";

describe("fuzzers", () => {
  describe("ffuf", () => {
    it("fuzzes httpbin status endpoint", { timeout: 60000 }, async () => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) return;
      if (!(await isServiceHealthy("ffuf"))) return;
      const result = await callTool("ffuf", "do-ffuf", {
        target: TARGETS.HTTPBIN_STATUS_FUZZ,
        args: ["-w", WORDLISTS.COMMON_PATHS, "-mc", "all"],
      });
      assertNotEmpty(result);
    });
  });

  describe("gobuster", () => {
    it("discovers paths on httpbin", { timeout: 60000 }, async () => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) return;
      if (!(await isServiceHealthy("gobuster"))) return;
      const result = await callTool("gobuster", "do-gobuster", {
        url: TARGETS.HTTPBIN,
        args: ["dir", "-w", WORDLISTS.COMMON_PATHS],
      });
      assertNotEmpty(result);
    });
  });
});
