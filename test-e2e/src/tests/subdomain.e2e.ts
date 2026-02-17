import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import {
  assertContains,
  assertIsError,
  assertIsJson,
  assertLineCount,
  assertMatchesAny,
  assertMatchesRegex,
} from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("subdomain enumeration", () => {
  describe("subfinder", () => {
    it(`finds subdomains for ${TARGETS.SUBDOMAIN_RICH}`, { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("subfinder"))) { t.skip("subfinder not healthy"); return; }
      const result = await callTool("subfinder", "do-subfinder", {
        domain: TARGETS.SUBDOMAIN_RICH,
      }, { requestTimeout: 90000 });
      assertContains(result, TARGETS.SUBDOMAIN_RICH);
      assertLineCount(result, 3);
      assertMatchesRegex(result, /[\w.-]+\.tesla\.com/);
    });

    it("returns empty or error for invalid domain", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("subfinder"))) { t.skip("subfinder not healthy"); return; }
      const result = await callTool("subfinder", "do-subfinder", {
        domain: "nonexistent-domain-xyz-12345.invalid",
      });
      // subfinder returns empty for nonexistent domains
      assertMatchesAny(result, ["", "no result", "error", "found 0"]);
    });
  });

  describe("assetfinder", () => {
    it(`finds assets for ${TARGETS.SUBDOMAIN_RICH}`, { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("assetfinder"))) { t.skip("assetfinder not healthy"); return; }
      const result = await callTool("assetfinder", "do-assetfinder", {
        target: TARGETS.SUBDOMAIN_RICH,
      });
      assertMatchesAny(result, [TARGETS.SUBDOMAIN_RICH, "No output"]);
    });

    it("returns empty for invalid domain", { timeout: 30000 }, async (t) => {
      if (!(await isServiceHealthy("assetfinder"))) { t.skip("assetfinder not healthy"); return; }
      const result = await callTool("assetfinder", "do-assetfinder", {
        target: "nonexistent-domain-xyz-12345.invalid",
      });
      assertMatchesAny(result, ["", "no output", "No output", "error"]);
    });
  });

  describe("crtsh", () => {
    it(`returns subdomains from certificate logs for ${TARGETS.SUBDOMAIN_RICH}`, { timeout: 120000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("crtsh"))) { t.skip("crtsh not healthy"); return; }
      const result = await callTool("crtsh", "do-crtsh", {
        target: TARGETS.SUBDOMAIN_RICH,
      }, { requestTimeout: 120000 });
      const parsed = assertIsJson(result);
      assert.ok(Array.isArray(parsed), "result should be a JSON array");
      const domains = parsed as string[];
      if (domains.length > 0) {
        assertContains(result, TARGETS.SUBDOMAIN_RICH);
        // crtsh returns array of subdomain strings, verify at least one matches the domain pattern
        const baseEscaped = TARGETS.SUBDOMAIN_RICH.replace(/\./g, "\\.");
        assertMatchesRegex(result, new RegExp(`[\\w.-]+\\.${baseEscaped}`));
      }
    });
  });

  describe("cero", () => {
    it("probes tls-target certificates and finds known CN", { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL_TLS);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("cero"))) { t.skip("cero not healthy"); return; }
      const result = await callTool("cero", "do-cero", {
        target: `${TARGETS.TLS_TARGET}:443`,
        args: [],
      });
      assertMatchesAny(result, ["tls-target", "tls-target.local", ".local"]);
    });

    it(`probes ${TARGETS.SUBDOMAIN_RICH} certificates (supplementary)`, { timeout: 60000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.PUBLIC);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("cero"))) { t.skip("cero not healthy"); return; }
      const result = await callTool("cero", "do-cero", {
        target: TARGETS.SUBDOMAIN_RICH,
        args: [],
      });
      assertMatchesAny(result, [TARGETS.SUBDOMAIN_RICH, ".com"]);
    });
  });

  describe("github-subdomains", () => {
    it("finds subdomains via GitHub (credential required)", { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.CREDENTIAL);
      if (skip) { t.skip(skip); return; }
      if (!process.env.GITHUB_TOKEN) { t.skip("GITHUB_TOKEN not set"); return; }
      if (!(await isServiceHealthy("github-subdomains"))) { t.skip("github-subdomains not healthy"); return; }
      const result = await callTool("github-subdomains", "do-github-subdomains", {
        target: TARGETS.SUBDOMAIN_RICH,
        args: ["-t", process.env.GITHUB_TOKEN],
      });
      assertContains(result, TARGETS.SUBDOMAIN_RICH);
    });
  });
});
