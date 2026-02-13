import { describe, it } from "node:test";
import { callTool } from "../helpers/mcp-client.js";
import { assertContains, assertIsJson } from "../helpers/assertions.js";
import { isServiceHealthy } from "../helpers/health.js";
import { shouldSkip, TestCategory } from "../helpers/categories.js";
import { TARGETS } from "../helpers/targets.js";

describe("shodan", () => {
    it("do-shodan-api-info returns plan and credits", { timeout: 30000 }, async (t) => {
        const skip = await shouldSkip(TestCategory.CREDENTIAL);
        if (skip) { t.skip(skip); return; }
        if (!process.env.SHODAN_API_KEY) { t.skip("SHODAN_API_KEY not set"); return; }
        if (!(await isServiceHealthy("shodan"))) { t.skip("shodan not healthy"); return; }
        const result = await callTool("shodan", "do-shodan-api-info", {});
        assertIsJson(result);
        assertContains(result, "query_credits");
    });

    it("do-shodan-search-count counts results without credits", { timeout: 30000 }, async (t) => {
        const skip = await shouldSkip(TestCategory.CREDENTIAL);
        if (skip) { t.skip(skip); return; }
        if (!process.env.SHODAN_API_KEY) { t.skip("SHODAN_API_KEY not set"); return; }
        if (!(await isServiceHealthy("shodan"))) { t.skip("shodan not healthy"); return; }
        const result = await callTool("shodan", "do-shodan-search-count", {
            query: "apache",
        });
        assertIsJson(result);
        assertContains(result, "total");
    });

    it("do-shodan-dns-resolve resolves a domain", { timeout: 30000 }, async (t) => {
        const skip = await shouldSkip(TestCategory.CREDENTIAL);
        if (skip) { t.skip(skip); return; }
        if (!process.env.SHODAN_API_KEY) { t.skip("SHODAN_API_KEY not set"); return; }
        if (!(await isServiceHealthy("shodan"))) { t.skip("shodan not healthy"); return; }
        const result = await callTool("shodan", "do-shodan-dns-resolve", {
            hostnames: [TARGETS.EXAMPLE],
        });
        assertIsJson(result);
        assertContains(result, TARGETS.EXAMPLE);
    });

    it("do-shodan-ports lists crawled ports", { timeout: 30000 }, async (t) => {
        const skip = await shouldSkip(TestCategory.CREDENTIAL);
        if (skip) { t.skip(skip); return; }
        if (!process.env.SHODAN_API_KEY) { t.skip("SHODAN_API_KEY not set"); return; }
        if (!(await isServiceHealthy("shodan"))) { t.skip("shodan not healthy"); return; }
        const result = await callTool("shodan", "do-shodan-ports", {});
        assertContains(result, "80");
    });

    it("do-shodan-search-filters lists available filters", { timeout: 30000 }, async (t) => {
        const skip = await shouldSkip(TestCategory.CREDENTIAL);
        if (skip) { t.skip(skip); return; }
        if (!process.env.SHODAN_API_KEY) { t.skip("SHODAN_API_KEY not set"); return; }
        if (!(await isServiceHealthy("shodan"))) { t.skip("shodan not healthy"); return; }
        const result = await callTool("shodan", "do-shodan-search-filters", {});
        assertContains(result, "port");
    });
});
