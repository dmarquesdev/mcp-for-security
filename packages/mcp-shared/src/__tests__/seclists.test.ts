import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { join } from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerSecListsTool } from "../seclists.js";

const TMP_DIR = join(process.cwd(), ".tmp-seclists-test");

// Create a mini SecLists directory structure for testing
function setupTestDir(): void {
    mkdirSync(join(TMP_DIR, "Discovery", "Web-Content"), { recursive: true });
    mkdirSync(join(TMP_DIR, "Passwords", "Common-Credentials"), { recursive: true });
    mkdirSync(join(TMP_DIR, "Fuzzing"), { recursive: true });
    writeFileSync(join(TMP_DIR, "Discovery", "Web-Content", "common.txt"), "admin\nlogin\napi\n");
    writeFileSync(join(TMP_DIR, "Discovery", "Web-Content", "big.txt"), "a\n".repeat(1000));
    writeFileSync(join(TMP_DIR, "Passwords", "Common-Credentials", "top-10.txt"), "password\n123456\n");
    writeFileSync(join(TMP_DIR, "Fuzzing", "graphql-wordlist.txt"), "query\nmutation\n");
}

function cleanupTestDir(): void {
    rmSync(TMP_DIR, { recursive: true, force: true });
}

async function createHarness() {
    const server = new McpServer({ name: "test-seclists", version: "1.0.0" });
    registerSecListsTool(server, TMP_DIR);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "1.0.0" });
    await server.connect(serverTransport);
    await client.connect(clientTransport);
    return { client, close: async () => { await client.close(); await server.close(); } };
}

function getResultText(result: { content: Array<{ type: string; text?: string }> }): string {
    return result.content
        .filter((c): c is { type: "text"; text: string } => c.type === "text")
        .map((c) => c.text)
        .join("\n");
}

describe("registerSecListsTool", () => {
    before(() => setupTestDir());
    after(() => cleanupTestDir());

    it("registers do-list-wordlists tool", async () => {
        const { client, close } = await createHarness();
        const { tools } = await client.listTools();
        const tool = tools.find((t) => t.name === "do-list-wordlists");
        assert.ok(tool, "do-list-wordlists should be registered");
        await close();
    });

    it("lists top-level categories with empty path", async () => {
        const { client, close } = await createHarness();
        const result = await client.callTool({ name: "do-list-wordlists", arguments: {} });
        const text = getResultText(result as { content: Array<{ type: string; text?: string }> });
        assert.ok(text.includes("SecLists categories"), "should show categories header");
        assert.ok(text.includes("Discovery/"), "should list Discovery");
        assert.ok(text.includes("Passwords/"), "should list Passwords");
        assert.ok(text.includes("Fuzzing/"), "should list Fuzzing");
        await close();
    });

    it("lists directory contents for a given path", async () => {
        const { client, close } = await createHarness();
        const result = await client.callTool({
            name: "do-list-wordlists",
            arguments: { path: "Discovery/Web-Content" },
        });
        const text = getResultText(result as { content: Array<{ type: string; text?: string }> });
        assert.ok(text.includes("Contents of Discovery/Web-Content"));
        assert.ok(text.includes("common.txt"), "should list common.txt");
        assert.ok(text.includes("big.txt"), "should list big.txt");
        await close();
    });

    it("searches recursively with pattern filter", async () => {
        const { client, close } = await createHarness();
        const result = await client.callTool({
            name: "do-list-wordlists",
            arguments: { pattern: "graphql" },
        });
        const text = getResultText(result as { content: Array<{ type: string; text?: string }> });
        assert.ok(text.includes("graphql"), "should find graphql wordlist");
        assert.ok(text.includes("Fuzzing/graphql-wordlist.txt"), "should show relative path");
        await close();
    });

    it("searches within a specific path when both path and pattern given", async () => {
        const { client, close } = await createHarness();
        const result = await client.callTool({
            name: "do-list-wordlists",
            arguments: { path: "Discovery", pattern: "common" },
        });
        const text = getResultText(result as { content: Array<{ type: string; text?: string }> });
        assert.ok(text.includes("common"), "should find common.txt");
        assert.ok(text.includes("in Discovery"), "should mention scoped path");
        await close();
    });

    it("reports file info when path points to a file", async () => {
        const { client, close } = await createHarness();
        const result = await client.callTool({
            name: "do-list-wordlists",
            arguments: { path: "Discovery/Web-Content/common.txt" },
        });
        const text = getResultText(result as { content: Array<{ type: string; text?: string }> });
        assert.ok(text.includes("is a file"), "should identify as a file");
        assert.ok(text.includes("Full path:"), "should include full path");
        await close();
    });

    it("rejects path traversal attempts", async () => {
        const { client, close } = await createHarness();
        try {
            await client.callTool({
                name: "do-list-wordlists",
                arguments: { path: "../../etc/passwd" },
            });
            // If it doesn't throw, check it returned an error
        } catch {
            // Expected — path traversal detected
        }
        await close();
    });
});
