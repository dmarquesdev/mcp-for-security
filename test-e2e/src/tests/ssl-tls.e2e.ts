import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertContains } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("SSL/TLS analysis", () => {
  describe("sslscan", () => {
    it(`scans ${TARGETS.EXAMPLE_HTTPS} TLS configuration`, { timeout: 60000 }, async () => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) return;
      if (!(await isServiceHealthy("sslscan"))) return;
      const result = await callTool("sslscan", "do-sslscan", {
        target: TARGETS.EXAMPLE_HTTPS,
        sslscan_args: [],
      });
      assertContains(result, "TLS");
    });
  });

  describe("testssl", () => {
    it(`checks protocols on ${TARGETS.EXAMPLE_TLS}`, { timeout: 120000 }, async () => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) return;
      if (!(await isServiceHealthy("testssl"))) return;
      const result = await callTool("testssl", "do-testssl-protocols", {
        target: TARGETS.EXAMPLE_TLS,
        args: [],
      });
      assertContains(result, "TLS");
    });
  });
});
