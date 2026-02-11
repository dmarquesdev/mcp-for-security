import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertContains } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";

describe("wordlist tools", () => {
  describe("seclists", () => {
    it("lists available categories", { timeout: 30000 }, async () => {
      const skip = await shouldSkip(TestCategory.SELF_CONTAINED);
      if (skip) return;
      if (!(await isServiceHealthy("seclists"))) return;
      const result = await callTool("seclists", "do-seclists-list-categories", {});
      assertContains(result, "Discovery");
    });
  });
});
