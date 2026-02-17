import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import {
  assertIsError,
  assertLineCount,
  assertMatchesAny,
  assertMatchesRegex,
} from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS, WORDLISTS } from "../helpers/targets.js";

describe("fuzzers", () => {
  describe("ffuf", () => {
    it("fuzzes httpbin status endpoint and finds results", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("ffuf"))) { t.skip("ffuf not healthy"); return; }
      const result = await callTool("ffuf", "do-ffuf", {
        target: TARGETS.HTTPBIN_STATUS_FUZZ,
        args: ["-w", WORDLISTS.COMMON_PATHS, "-mc", "all"],
      });
      assertMatchesAny(result, ["status", "http", "ffuf", "FUZZ", "200"]);
      assertLineCount(result, 1);
    });

    it("returns error for missing wordlist", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("ffuf"))) { t.skip("ffuf not healthy"); return; }
      const result = await callTool("ffuf", "do-ffuf", {
        target: TARGETS.HTTPBIN_STATUS_FUZZ,
        args: ["-w", "/nonexistent/wordlist.txt"],
      });
      assertIsError(result);
    });
  });

  describe("gobuster", () => {
    it("discovers paths on httpbin", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("gobuster"))) { t.skip("gobuster not healthy"); return; }
      const result = await callTool("gobuster", "do-gobuster", {
        url: TARGETS.HTTPBIN,
        args: ["dir", "-w", WORDLISTS.COMMON_PATHS],
      });
      assertMatchesAny(result, ["status", "/", "gobuster", "200"]);
      assertLineCount(result, 1);
    });

    it("returns error for missing wordlist", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("gobuster"))) { t.skip("gobuster not healthy"); return; }
      const result = await callTool("gobuster", "do-gobuster", {
        url: TARGETS.HTTPBIN,
        args: ["dir", "-w", "/nonexistent/wordlist.txt"],
      });
      assertIsError(result);
    });
  });
});
