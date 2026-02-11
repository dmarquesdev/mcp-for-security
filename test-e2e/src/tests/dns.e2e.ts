import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertNotEmpty } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS, WORDLISTS } from "../helpers/targets.js";

describe("DNS tools", () => {
  describe("shuffledns", () => {
    it(`brute-forces subdomains for ${TARGETS.EXAMPLE}`, { timeout: 90000 }, async (t) => {
      const skip = await shouldSkip(TestCategory.LOCAL);
      if (skip) { t.skip(skip); return; }
      if (!(await isServiceHealthy("shuffledns"))) { t.skip("shuffledns not healthy"); return; }
      const result = await callTool("shuffledns", "do-shuffledns", {
        target: TARGETS.EXAMPLE,
        args: ["-r", WORDLISTS.RESOLVERS, "-w", WORDLISTS.SUBDOMAINS],
      });
      assertNotEmpty(result);
    });
  });
});
