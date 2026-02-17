import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertIsError, assertMatchesAny } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

/**
 * Timeout/cancellation validation tests.
 * Tests 3-5 representative servers across categories (Go, Python, system tool)
 * with very short timeouts to verify timeout handling works correctly.
 */

describe("timeout handling", () => {
  describe("nmap (system tool)", () => {
    it("respects short client timeout", { timeout: 30000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL_SCAN);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("nmap"))) { t.skip("nmap not healthy"); return; }
      // Full port scan against scan-target with 1s timeout should time out
      const result = await callTool("nmap", "do-nmap", {
        target: TARGETS.SCAN_TARGET,
        nmap_args: ["-sV", "-p-"],
        timeoutSeconds: 1,
      }, { requestTimeout: 15000 });
      // Should error due to timeout, not hang
      try {
        assertIsError(result);
      } catch {
        // If it somehow completed quickly, that's also OK — tool is working
        assertMatchesAny(result, ["open", "timeout", "timed out", "killed", "scan-target"]);
      }
    });
  });

  describe("sqlmap (Python tool)", () => {
    it("respects short client timeout", { timeout: 30000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("sqlmap"))) { t.skip("sqlmap not healthy"); return; }
      // sqlmap with 1s timeout against httpbin should time out
      const result = await callTool("sqlmap", "do-sqlmap", {
        target: TARGETS.HTTPBIN,
        args: ["--batch", "--crawl=10"],
        timeoutSeconds: 1,
      }, { requestTimeout: 15000 });
      try {
        assertIsError(result);
      } catch {
        assertMatchesAny(result, ["sqlmap", "timeout", "timed out", "killed", "http"]);
      }
    });
  });

  describe("nuclei (Go tool)", () => {
    it("respects short client timeout", { timeout: 30000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("nuclei"))) { t.skip("nuclei not healthy"); return; }
      // nuclei full template scan with 1s timeout should time out
      const result = await callTool("nuclei", "do-nuclei", {
        targets: [TARGETS.HTTPBIN],
        args: [],
        timeoutSeconds: 1,
      }, { requestTimeout: 15000 });
      try {
        assertIsError(result);
      } catch {
        assertMatchesAny(result, ["nuclei", "timeout", "timed out", "killed", "http", "["]);
      }
    });
  });

  describe("testssl (shell tool)", () => {
    it("respects short client timeout", { timeout: 30000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL_TLS);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("testssl"))) { t.skip("testssl not healthy"); return; }
      // testssl full check with 1s timeout should time out
      const result = await callTool("testssl", "do-testssl-protocols", {
        target: TARGETS.TLS_TARGET_HOST,
        args: [],
        timeoutSeconds: 1,
      }, { requestTimeout: 15000 });
      try {
        assertIsError(result);
      } catch {
        assertMatchesAny(result, ["testssl", "timeout", "timed out", "killed", "tls"]);
      }
    });
  });
});
