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

const PYTHON_PATH = "python3";
const SMUGGLER_SCRIPT = "smuggler.py";

interface VulnEntry { mutation: string; severity: string; }

function parseResults(output: string) {
    const vulnerabilities: { cl_te: VulnEntry[]; te_cl: VulnEntry[] } = { cl_te: [], te_cl: [] };

    const clteRegex = /\[(\+|!)\] Potential (CL\.TE) .* \((\w+)\)/gi;
    const teclRegex = /\[(\+|!)\] Potential (TE\.CL) .* \((\w+)\)/gi;

    let match;
    while ((match = clteRegex.exec(output)) !== null) {
        vulnerabilities.cl_te.push({ mutation: match[3], severity: match[1] === "+" ? "high" : "medium" });
    }
    while ((match = teclRegex.exec(output)) !== null) {
        vulnerabilities.te_cl.push({ mutation: match[3], severity: match[1] === "+" ? "high" : "medium" });
    }

    return vulnerabilities;
}

describe("smuggler-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("smuggler");

    harness.server.tool(
        "do-smuggler",
        "Run Smuggler to test for HTTP request smuggling issues",
        {
            url: z.string().url().describe("Target URL to test"),
            smuggler_args: z.array(z.string()).optional().describe("Additional smuggler arguments"),
        },
        async ({ url, smuggler_args = [] }) => {
            const allArgs = [SMUGGLER_SCRIPT, "-u", url, ...smuggler_args];
            const result = await mock.spawn(PYTHON_PATH, allArgs);
            const response = formatToolResult(result, { toolName: "smuggler", includeStderr: true, stripAnsi: true });

            const output = response.content[0].text;
            const vulnResults = parseResults(output);

            if (vulnResults.cl_te.length > 0 || vulnResults.te_cl.length > 0) {
                response.content[0].text += `\n\n--- Findings ---\nCL.TE: ${vulnResults.cl_te.length} potential issues\nTE.CL: ${vulnResults.te_cl.length} potential issues`;
            }

            return response;
        },
    );

    afterEach(() => mock.reset());

    it("registers the do-smuggler tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-smuggler");
        await harness.cleanup();
    });

    it("passes python path, script, and url to spawn correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-smuggler", {
            url: "http://example.com",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "python3");
        assert.deepEqual(mock.calls[0].args, [
            "smuggler.py", "-u", "http://example.com",
        ]);
        await harness.cleanup();
    });

    it("passes additional smuggler_args correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-smuggler", {
            url: "http://example.com",
            smuggler_args: ["-m", "GET", "-v"],
        });
        const last = mock.lastCall();
        assert.ok(last);
        assert.deepEqual(last.args, [
            "smuggler.py", "-u", "http://example.com", "-m", "GET", "-v",
        ]);
        await harness.cleanup();
    });

    it("defaults smuggler_args to empty array when omitted", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-smuggler", {
            url: "http://example.com",
        });
        const last = mock.lastCall();
        assert.ok(last);
        assert.deepEqual(last.args, ["smuggler.py", "-u", "http://example.com"]);
        await harness.cleanup();
    });

    it("appends findings when vulnerabilities are detected", async () => {
        const vulnMock = createMockSpawn({
            defaultResult: {
                stdout: "[+] Potential CL.TE issue found (chunked)\n[!] Potential TE.CL issue found (linefeed)",
                stderr: "",
                exitCode: 0,
            },
        });
        const h = createTestServer("smuggler-vuln");
        h.server.tool(
            "do-smuggler",
            "Run Smuggler",
            {
                url: z.string().url(),
                smuggler_args: z.array(z.string()).optional(),
            },
            async ({ url, smuggler_args = [] }) => {
                const allArgs = [SMUGGLER_SCRIPT, "-u", url, ...smuggler_args];
                const result = await vulnMock.spawn(PYTHON_PATH, allArgs);
                const response = formatToolResult(result, { toolName: "smuggler", includeStderr: true, stripAnsi: true });

                const output = response.content[0].text;
                const vulnResults = parseResults(output);

                if (vulnResults.cl_te.length > 0 || vulnResults.te_cl.length > 0) {
                    response.content[0].text += `\n\n--- Findings ---\nCL.TE: ${vulnResults.cl_te.length} potential issues\nTE.CL: ${vulnResults.te_cl.length} potential issues`;
                }

                return response;
            },
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-smuggler", {
            url: "http://example.com",
        });
        const text = getResultText(result);
        assert.ok(text.includes("--- Findings ---"));
        assert.ok(text.includes("CL.TE: 1 potential issues"));
        assert.ok(text.includes("TE.CL: 1 potential issues"));
        await h.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "Testing for HTTP Request Smuggling", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("smuggler-output");
        h.server.tool(
            "do-smuggler",
            "Run Smuggler",
            {
                url: z.string().url(),
                smuggler_args: z.array(z.string()).optional(),
            },
            async ({ url, smuggler_args = [] }) => {
                const allArgs = [SMUGGLER_SCRIPT, "-u", url, ...smuggler_args];
                const result = await customMock.spawn(PYTHON_PATH, allArgs);
                return formatToolResult(result, { toolName: "smuggler", includeStderr: true, stripAnsi: true });
            },
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-smuggler", {
            url: "http://example.com",
        });
        const text = getResultText(result);
        assert.ok(text.includes("Testing for HTTP Request Smuggling"));
        await h.cleanup();
    });

    it("rejects when url is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-smuggler", {});
        await harness.cleanup();
    });

    it("rejects when url is not a valid URL", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-smuggler", {
            url: "not-a-url",
        });
        await harness.cleanup();
    });
});
