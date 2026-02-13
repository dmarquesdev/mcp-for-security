import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertContains } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("web probing", () => {
  describe("httpx", () => {
    it(`probes ${TARGETS.EXAMPLE} and returns HTTP info`, { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("httpx"))) { t.skip("httpx not healthy"); return; }
      const result = await callTool("httpx", "do-httpx", {
        target: [TARGETS.EXAMPLE],
      });
      assertContains(result, TARGETS.EXAMPLE);
    });
  });

  describe("katana", () => {
    it(`crawls ${TARGETS.EXAMPLE_HTTPS}`, { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("katana"))) { t.skip("katana not healthy"); return; }
      const result = await callTool("katana", "do-katana", {
        target: [TARGETS.EXAMPLE_HTTPS],
        depth: 1,
      });
      assertContains(result, TARGETS.EXAMPLE);
    });
  });

  describe("gau", () => {
    it(`fetches known URLs for ${TARGETS.NMAP_SCANME}`, { timeout: 120000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("gau"))) { t.skip("gau not healthy"); return; }
      const result = await callTool("gau", "do-gau", {
        targets: [TARGETS.NMAP_SCANME],
      }, { requestTimeout: 120000 });
      assertContains(result, TARGETS.NMAP_SCANME);
    });
  });

  describe("waybackurls", () => {
    it(`finds archived URLs for ${TARGETS.NMAP_SCANME}`, { timeout: 120000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("waybackurls"))) { t.skip("waybackurls not healthy"); return; }
      const result = await callTool("waybackurls", "do-waybackurls", {
        target: TARGETS.NMAP_SCANME,
      }, { requestTimeout: 120000 });
      assertContains(result, TARGETS.NMAP_SCANME);
    });
  });
});
