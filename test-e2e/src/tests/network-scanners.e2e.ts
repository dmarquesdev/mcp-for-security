import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import {
  assertContains,
  assertContainsPort,
  assertIsError,
  assertLineCount,
  assertMatchesAny,
  assertMatchesRegex,
} from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("network scanners", () => {
  describe("nmap", () => {
    it("scans scan-target and finds known open ports", { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL_SCAN);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("nmap"))) { t.skip("nmap not healthy"); return; }
      const result = await callTool("nmap", "do-nmap", {
        target: TARGETS.SCAN_TARGET,
        nmap_args: ["-T4", "-p", "22,80,443,3306,8080"],
      });
      assertContains(result, "open");
      assertContainsPort(result, 80);
      assertContainsPort(result, 22);
      assertLineCount(result, 5);
    });

    it("returns grepable output with port format", { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL_SCAN);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("nmap"))) { t.skip("nmap not healthy"); return; }
      const result = await callTool("nmap", "do-nmap", {
        target: TARGETS.SCAN_TARGET,
        nmap_args: ["-T4", "-p", "80,443", "-oG", "-"],
      });
      assertMatchesRegex(result, /\d+\/open\/tcp/);
      assertContains(result, "80/open");
    });

    it("returns error for empty target", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("nmap"))) { t.skip("nmap not healthy"); return; }
      const result = await callTool("nmap", "do-nmap", {
        target: "",
        nmap_args: [],
      });
      try {
        assertIsError(result);
      } catch {
        // nmap exits 0 with message; accept error-like content
        assertMatchesAny(result, ["failed", "no targets", "warning", "0 hosts", "0 addresses"]);
      }
    });
  });

  describe("naabu", () => {
    it("scans scan-target for known ports", { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL_SCAN);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("naabu"))) { t.skip("naabu not healthy"); return; }
      // naabu (ProjectDiscovery) uses its own Go DNS resolver that can't resolve
      // Docker single-label hostnames — pass Docker's internal DNS resolver
      const result = await callTool("naabu", "do-naabu", {
        host: TARGETS.SCAN_TARGET,
        top_ports: 100,
        scan_type: "c",
        resolvers: "127.0.0.11",
      });
      assertContains(result, TARGETS.SCAN_TARGET);
      assertMatchesRegex(result, /:\d+/);
    });

    it("returns error for empty host", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("naabu"))) { t.skip("naabu not healthy"); return; }
      const result = await callTool("naabu", "do-naabu", {
        host: "",
        top_ports: 10,
        scan_type: "c",
      });
      assertIsError(result);
    });
  });

  describe("masscan", () => {
    it("scans scan-target (requires privileged mode)", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PRIVILEGED);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("masscan"))) { t.skip("masscan not healthy"); return; }
      const result = await callTool("masscan", "do-masscan", {
        target: TARGETS.SCAN_TARGET,
        args: ["-p80,443", "--rate", "100"],
      });
      assertContains(result, "open");
      assertContainsPort(result, 80);
    });
  });
});
