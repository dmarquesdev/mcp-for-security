import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import {
  assertIsError,
  assertIsJson,
  assertLineCount,
  assertMatchesAny,
  assertMatchesRegex,
} from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("HTTP analysis tools", () => {
  describe("http-headers-security", () => {
    it("analyzes headers for httpbin", { timeout: 30000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("http-headers-security"))) { t.skip("http-headers-security not healthy"); return; }
      const result = await callTool("http-headers-security", "do-analyze-http-headers", {
        target: TARGETS.HTTPBIN_GET,
      });
      assertIsJson(result);
      // Should contain security header analysis fields
      assertMatchesAny(result, ["header", "security", "content-type", "server", "x-frame"]);
    });

    it("returns error for unreachable URL", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("http-headers-security"))) { t.skip("http-headers-security not healthy"); return; }
      const result = await callTool("http-headers-security", "do-analyze-http-headers", {
        target: "http://nonexistent-host-e2e-12345/",
      });
      assertIsError(result);
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
      assertMatchesAny(result, ["http", "smuggl", "request", "probe", "not vulnerable"]);
      assertLineCount(result, 1);
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
      assertMatchesAny(result, ["http", "parameter", "arjun", "url", "found"]);
    });
  });
});
