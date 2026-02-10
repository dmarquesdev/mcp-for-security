import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { z } from "zod";
import {
    createTestServer,
    createMockSpawn,
    assertToolExists,
    assertToolCallSucceeds,
    assertToolCallFails,
    getResultText,
} from "test-helpers";
import { formatToolResult } from "mcp-shared";

describe("amass-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("amass");

    harness.server.tool(
        "do-amass",
        "Advanced subdomain enumeration and reconnaissance tool",
        {
            subcommand: z.enum(["enum", "intel"]),
            domain: z.string().optional(),
            intel_whois: z.boolean().optional(),
            intel_organization: z.string().optional(),
            enum_type: z.enum(["active", "passive"]).optional(),
            enum_brute: z.boolean().optional(),
            enum_brute_wordlist: z.string().optional(),
        },
        async ({ subcommand, domain, intel_whois, intel_organization, enum_type, enum_brute, enum_brute_wordlist }) => {
            const amassArgs: string[] = [subcommand];

            if (subcommand === "enum") {
                if (!domain) throw new Error("Domain parameter is required for 'enum' subcommand");
                amassArgs.push("-d", domain);
                if (enum_type === "passive") amassArgs.push("-passive");
                if (enum_brute === true) {
                    amassArgs.push("-brute");
                    if (enum_brute_wordlist) amassArgs.push("-w", enum_brute_wordlist);
                }
            } else if (subcommand === "intel") {
                if (!domain && !intel_organization) {
                    throw new Error("Either domain or organization parameter is required for 'intel' subcommand");
                }
                if (domain) {
                    amassArgs.push("-d", domain);
                    if (intel_whois !== true) {
                        throw new Error("For domain parameter whois is required");
                    }
                }
                if (intel_organization) amassArgs.push("-org", intel_organization);
                if (intel_whois === true) amassArgs.push("-whois");
            }

            const result = await mock.spawn("amass", amassArgs);
            return formatToolResult(result, { toolName: "amass", includeStderr: true });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-amass tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-amass");
        await harness.cleanup();
    });

    it("enum subcommand with domain builds correct args", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-amass", {
            subcommand: "enum",
            domain: "example.com",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "amass");
        assert.deepEqual(mock.calls[0].args, ["enum", "-d", "example.com"]);
        await harness.cleanup();
    });

    it("enum passive mode appends -passive flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-amass", {
            subcommand: "enum",
            domain: "example.com",
            enum_type: "passive",
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["enum", "-d", "example.com", "-passive"]);
        await harness.cleanup();
    });

    it("enum brute mode appends -brute and optional wordlist", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-amass", {
            subcommand: "enum",
            domain: "example.com",
            enum_brute: true,
            enum_brute_wordlist: "/tmp/wordlist.txt",
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["enum", "-d", "example.com", "-brute", "-w", "/tmp/wordlist.txt"]);
        await harness.cleanup();
    });

    it("enum brute without wordlist omits -w flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-amass", {
            subcommand: "enum",
            domain: "example.com",
            enum_brute: true,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["enum", "-d", "example.com", "-brute"]);
        await harness.cleanup();
    });

    it("intel subcommand with organization builds correct args", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-amass", {
            subcommand: "intel",
            intel_organization: "Example Corp",
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["intel", "-org", "Example Corp"]);
        await harness.cleanup();
    });

    it("intel subcommand with domain and whois builds correct args", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-amass", {
            subcommand: "intel",
            domain: "example.com",
            intel_whois: true,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["intel", "-d", "example.com", "-whois"]);
        await harness.cleanup();
    });

    it("intel with domain and org and whois builds all flags", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-amass", {
            subcommand: "intel",
            domain: "example.com",
            intel_organization: "Example Corp",
            intel_whois: true,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, ["intel", "-d", "example.com", "-org", "Example Corp", "-whois"]);
        await harness.cleanup();
    });

    it("enum without domain throws error", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-amass", {
            subcommand: "enum",
        });
        await harness.cleanup();
    });

    it("intel without domain and without organization throws error", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-amass", {
            subcommand: "intel",
        });
        await harness.cleanup();
    });

    it("intel with domain but without whois throws error", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-amass", {
            subcommand: "intel",
            domain: "example.com",
        });
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "sub1.example.com\nsub2.example.com", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("amass-output");
        h.server.tool(
            "do-amass",
            "amass",
            {
                subcommand: z.enum(["enum", "intel"]),
                domain: z.string().optional(),
                intel_whois: z.boolean().optional(),
                intel_organization: z.string().optional(),
                enum_type: z.enum(["active", "passive"]).optional(),
                enum_brute: z.boolean().optional(),
                enum_brute_wordlist: z.string().optional(),
            },
            async ({ subcommand, domain }) => {
                const amassArgs: string[] = [subcommand];
                if (domain) amassArgs.push("-d", domain);
                const result = await customMock.spawn("amass", amassArgs);
                return formatToolResult(result, { toolName: "amass", includeStderr: true });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-amass", {
            subcommand: "enum",
            domain: "example.com",
        });
        const text = getResultText(result);
        assert.ok(text.includes("sub1.example.com"));
        assert.ok(text.includes("sub2.example.com"));
        await h.cleanup();
    });
});
