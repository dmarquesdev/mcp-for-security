import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertContains, assertNotEmpty } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("web probing", () => {
  describe("httpx", () => {
    it(`probes ${TARGETS.EXAMPLE} and returns HTTP info`, { timeout: 60000 }, async () => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) return;
      if (!(await isServiceHealthy("httpx"))) return;
      const result = await callTool("httpx", "do-httpx", {
        target: [TARGETS.EXAMPLE],
      });
      assertContains(result, "google.com");
    });
  });

  describe("katana", () => {
    it(`crawls ${TARGETS.EXAMPLE_HTTPS}`, { timeout: 90000 }, async () => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) return;
      if (!(await isServiceHealthy("katana"))) return;
      const result = await callTool("katana", "do-katana", {
        target: [TARGETS.EXAMPLE_HTTPS],
        depth: 1,
      });
      assertContains(result, "google.com");
    });
  });

  describe("waybackurls", () => {
    it("finds archived URLs for scanme.nmap.org", { timeout: 120000 }, async () => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) return;
      if (!(await isServiceHealthy("waybackurls"))) return;
      const result = await callTool("waybackurls", "do-waybackurls", {
        target: TARGETS.NMAP_SCANME,
      }, { requestTimeout: 120000 });
      assertNotEmpty(result);
    });
  });
});
