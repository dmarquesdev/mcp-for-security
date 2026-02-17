import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import {
  assertContains,
  assertIsError,
  assertLineCount,
  assertMatchesAny,
  assertMatchesRegex,
} from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("SSL/TLS analysis", () => {
  describe("sslscan", () => {
    it("scans tls-target and detects TLS versions", { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL_TLS);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("sslscan"))) { t.skip("sslscan not healthy"); return; }
      const result = await callTool("sslscan", "do-sslscan", {
        target: TARGETS.TLS_TARGET_HOST,
        sslscan_args: [],
      }, { requestTimeout: 90000 });
      assertContains(result, "TLS");
      assertMatchesAny(result, ["TLSv1.2", "TLSv1.3", "tls-target"]);
      assertLineCount(result, 5);
    });

    it("returns error for non-TLS port", { timeout: 30000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL_SCAN);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("sslscan"))) { t.skip("sslscan not healthy"); return; }
      const result = await callTool("sslscan", "do-sslscan", {
        target: `${TARGETS.SCAN_TARGET}:80`,
        sslscan_args: [],
      }, { requestTimeout: 30000 });
      // Should either error or show no TLS support
      assertMatchesAny(result, ["error", "failed", "no tls", "connection", "ssl"]);
    });
  });

  describe("testssl", () => {
    it("checks protocols on tls-target", { timeout: 120000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL_TLS);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("testssl"))) { t.skip("testssl not healthy"); return; }
      const result = await callTool("testssl", "do-testssl-protocols", {
        target: TARGETS.TLS_TARGET_HOST,
        args: [],
      }, { requestTimeout: 120000 });
      assertContains(result, "TLS");
      assertMatchesAny(result, ["TLS 1.2", "TLS 1.3", "TLSv1.2", "TLSv1.3"]);
      assertLineCount(result, 3);
    });

    it("returns error for empty target", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("testssl"))) { t.skip("testssl not healthy"); return; }
      const result = await callTool("testssl", "do-testssl-protocols", {
        target: "",
        args: [],
      });
      assertIsError(result);
    });
  });
});
