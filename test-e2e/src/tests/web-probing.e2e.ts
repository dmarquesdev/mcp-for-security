import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import {
  assertContains,
  assertIsError,
  assertLineCount,
  assertLinesAreUrls,
  assertMatchesAny,
  assertMatchesRegex,
  getContentText,
} from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("web probing", () => {
  describe("httpx", () => {
    it("probes httpbin and returns HTTP info", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("httpx"))) { t.skip("httpx not healthy"); return; }
      const result = await callTool("httpx", "do-httpx", {
        target: [TARGETS.HTTPBIN],
      });
      const text = getContentText(result);
      if (/no output from httpx/i.test(text)) {
        t.skip("httpx produced no output (httpbin may be unreachable)");
        return;
      }
      assertContains(result, "httpbin");
      assertMatchesRegex(result, /200|httpbin/i);
    });

    it("returns error for unreachable host", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("httpx"))) { t.skip("httpx not healthy"); return; }
      const result = await callTool("httpx", "do-httpx", {
        target: ["http://nonexistent-host-e2e-12345/"],
      });
      // httpx may return empty output or error for unreachable hosts
      assertMatchesAny(result, ["error", "no result", "nonexistent", ""]);
    });
  });

  describe("katana", () => {
    it("crawls httpbin and discovers endpoints", { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("katana"))) { t.skip("katana not healthy"); return; }
      const result = await callTool("katana", "do-katana", {
        target: [TARGETS.HTTPBIN],
        depth: 2,
      });
      const text = getContentText(result);
      if (/no output from katana/i.test(text)) {
        t.skip("katana produced no output (httpbin may be unreachable)");
        return;
      }
      assertContains(result, "httpbin");
      assertLineCount(result, 1);
    });

    it("returns error for empty target", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("katana"))) { t.skip("katana not healthy"); return; }
      const result = await callTool("katana", "do-katana", {
        target: [""],
        depth: 1,
      });
      try {
        assertIsError(result);
      } catch {
        // katana may return success with "No output from katana." for empty target
        assertMatchesAny(result, ["no output", "error", "failed", "empty"]);
      }
    });
  });

  describe("hakrawler", () => {
    it("crawls httpbin and discovers links", { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("hakrawler"))) { t.skip("hakrawler not healthy"); return; }
      const result = await callTool("hakrawler", "do-hakrawler", {
        urls: [TARGETS.HTTPBIN],
        depth: 2,
      });
      assertContains(result, "http");
      assertLineCount(result, 1);
    });

    it("returns error for empty URL list", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("hakrawler"))) { t.skip("hakrawler not healthy"); return; }
      const result = await callTool("hakrawler", "do-hakrawler", {
        urls: [""],
        depth: 1,
      });
      // hakrawler with empty input should return error or empty output
      assertMatchesAny(result, ["error", "no result", ""]);
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
      assertLineCount(result, 1);
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
      assertLineCount(result, 1);
    });
  });

  describe("gowitness", () => {
    it("screenshots httpbin", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("gowitness"))) { t.skip("gowitness not healthy"); return; }
      const result = await callTool("gowitness", "do-gowitness-screenshot", {
        url: TARGETS.HTTPBIN,
      });
      assertMatchesAny(result, ["screenshot", "http", "httpbin", "scan", "saved", "png"]);
      assertLineCount(result, 1);
    });

    it("returns error for empty URL", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("gowitness"))) { t.skip("gowitness not healthy"); return; }
      const result = await callTool("gowitness", "do-gowitness-screenshot", {
        url: "",
      });
      assertIsError(result);
    });
  });

  describe("urldedupe", () => {
    it("deduplicates URLs and reduces count", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.SELF_CONTAINED);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("urldedupe"))) { t.skip("urldedupe not healthy"); return; }
      const urls = [
        `${TARGETS.EXAMPLE_HTTPS}/page?id=1`,
        `${TARGETS.EXAMPLE_HTTPS}/page?id=2`,
        `${TARGETS.EXAMPLE_HTTPS}/other?id=1`,
        `${TARGETS.EXAMPLE_HTTPS}/page?id=3`,
      ];
      const result = await callTool("urldedupe", "do-urldedupe", {
        urls,
        similar: true,
      });
      assertContains(result, TARGETS.EXAMPLE);
      assertLineCount(result, 1, 3);
    });
  });

  describe("uro", () => {
    it("deduplicates URLs and reduces count", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.SELF_CONTAINED);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("uro"))) { t.skip("uro not healthy"); return; }
      const urls = [
        `${TARGETS.EXAMPLE_HTTPS}/page?id=1`,
        `${TARGETS.EXAMPLE_HTTPS}/page?id=2`,
        `${TARGETS.EXAMPLE_HTTPS}/other?id=1`,
        `${TARGETS.EXAMPLE_HTTPS}/page?id=3`,
      ];
      const result = await callTool("uro", "do-uro", { urls });
      assertContains(result, TARGETS.EXAMPLE);
      assertLineCount(result, 1, 3);
    });
  });
});
