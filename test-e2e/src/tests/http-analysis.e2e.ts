import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertMatchesAny, assertIsJson } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("HTTP analysis tools", () => {
  describe("http-headers-security", () => {
    it(`analyzes headers for ${TARGETS.EXAMPLE_HTTPS}`, { timeout: 30000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("http-headers-security"))) { t.skip("http-headers-security not healthy"); return; }
      const result = await callTool("http-headers-security", "do-analyze-http-headers", {
        target: TARGETS.EXAMPLE_HTTPS,
      });
      assertIsJson(result);
    });
  });

  describe("smuggler", () => {
    it("tests httpbin for request smuggling", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("smuggler"))) { t.skip("smuggler not healthy"); return; }
      const result = await callTool("smuggler", "do-smuggler", {
        target: TARGETS.HTTPBIN,
        args: [],
      });
      assertMatchesAny(result, ["http", "smuggl", "request", "probe"]);
    });
  });

  describe("arjun", () => {
    it("discovers parameters on httpbin/get", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("arjun"))) { t.skip("arjun not healthy"); return; }
      const result = await callTool("arjun", "do-arjun", {
        target: TARGETS.HTTPBIN_GET,
        args: [],
      });
      assertMatchesAny(result, ["http", "parameter", "arjun"]);
    });
  });
});
