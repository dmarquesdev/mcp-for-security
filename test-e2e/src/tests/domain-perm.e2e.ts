import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertNotEmpty } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";

describe("domain permutation", () => {
  describe("alterx", () => {
    it("generates permutations for api.example.com", { timeout: 30000 }, async () => {
      const skip = await shouldSkip(TestCategory.SELF_CONTAINED);
      if (skip) return;
      if (!(await isServiceHealthy("alterx"))) return;
      const result = await callTool("alterx", "do-alterx", {
        domain: "api.example.com",
        args: ["-p", "{{word}}.{{suffix}}"],
      });
      assertNotEmpty(result);
    });
  });
});
