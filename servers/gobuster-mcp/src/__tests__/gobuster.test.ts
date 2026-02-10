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
import type { ToolContent } from "mcp-shared";

describe("gobuster-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("gobuster");

    // Shared runGobuster helper matching server implementation
    async function runGobuster(mode: string, modeArgs: string[]): Promise<ToolContent> {
        const result = await mock.spawn("gobuster", [mode, ...modeArgs, "--no-progress", "--no-color", "-q"]);
        return formatToolResult(result, { toolName: "gobuster" });
    }

    // Tool 1: do-gobuster-dir
    harness.server.tool(
        "do-gobuster-dir",
        "Brute-force directories and files on a web server",
        {
            url: z.string().describe("Target URL"),
            wordlist: z.string().describe("Path to wordlist file"),
            extensions: z.string().optional().describe("File extensions"),
            status_codes: z.string().optional().describe("Positive status codes"),
            method: z.string().optional().describe("HTTP method"),
            follow_redirect: z.boolean().optional().describe("Follow redirects"),
            threads: z.number().optional().describe("Concurrent threads"),
            no_tls_validation: z.boolean().optional().describe("Skip TLS verification"),
        },
        async ({ url, wordlist, extensions, status_codes, method, follow_redirect, threads, no_tls_validation }) => {
            const gobusterArgs: string[] = [];
            gobusterArgs.push("-u", url);
            gobusterArgs.push("-w", wordlist);
            if (extensions) gobusterArgs.push("-x", extensions);
            if (status_codes) gobusterArgs.push("-s", status_codes);
            if (method) gobusterArgs.push("-m", method);
            if (follow_redirect) gobusterArgs.push("-r");
            if (no_tls_validation) gobusterArgs.push("-k");
            if (threads) gobusterArgs.push("-t", threads.toString());
            return runGobuster("dir", gobusterArgs);
        }
    );

    // Tool 2: do-gobuster-dns
    harness.server.tool(
        "do-gobuster-dns",
        "Enumerate DNS subdomains",
        {
            domain: z.string().describe("Target domain"),
            wordlist: z.string().describe("Path to wordlist file"),
            resolver: z.string().optional().describe("Custom DNS resolver"),
            show_ips: z.boolean().optional().describe("Show IP addresses"),
            show_cname: z.boolean().optional().describe("Show CNAME records"),
            threads: z.number().optional().describe("Concurrent threads"),
        },
        async ({ domain, wordlist, resolver, show_ips, show_cname, threads }) => {
            const gobusterArgs: string[] = [];
            gobusterArgs.push("-d", domain);
            gobusterArgs.push("-w", wordlist);
            if (resolver) gobusterArgs.push("-r", resolver);
            if (show_ips) gobusterArgs.push("-i");
            if (show_cname) gobusterArgs.push("-c");
            if (threads) gobusterArgs.push("-t", threads.toString());
            return runGobuster("dns", gobusterArgs);
        }
    );

    // Tool 3: do-gobuster-tftp
    harness.server.tool(
        "do-gobuster-tftp",
        "Enumerate TFTP servers",
        {
            server: z.string().describe("Target TFTP server"),
            wordlist: z.string().describe("Path to wordlist file"),
            timeout: z.string().optional().describe("TFTP timeout"),
            threads: z.number().optional().describe("Concurrent threads"),
        },
        async ({ server: tftpServer, wordlist, timeout, threads }) => {
            const gobusterArgs: string[] = [];
            gobusterArgs.push("-s", tftpServer);
            gobusterArgs.push("-w", wordlist);
            if (timeout) gobusterArgs.push("--timeout", timeout);
            if (threads) gobusterArgs.push("-t", threads.toString());
            return runGobuster("tftp", gobusterArgs);
        }
    );

    afterEach(() => mock.reset());

    // --- do-gobuster-dir tests ---

    it("registers the do-gobuster-dir tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-gobuster-dir");
        await harness.cleanup();
    });

    it("dir: passes url and wordlist with mode prefix and trailing flags", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gobuster-dir", {
            url: "https://example.com",
            wordlist: "/usr/share/wordlists/common.txt",
        });
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "gobuster");
        assert.deepEqual(mock.calls[0].args, [
            "dir", "-u", "https://example.com", "-w", "/usr/share/wordlists/common.txt",
            "--no-progress", "--no-color", "-q",
        ]);
        await harness.cleanup();
    });

    it("dir: appends optional flags correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gobuster-dir", {
            url: "https://example.com",
            wordlist: "/wordlist.txt",
            extensions: "php,html",
            status_codes: "200,301",
            method: "POST",
            follow_redirect: true,
            no_tls_validation: true,
            threads: 20,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "dir",
            "-u", "https://example.com",
            "-w", "/wordlist.txt",
            "-x", "php,html",
            "-s", "200,301",
            "-m", "POST",
            "-r",
            "-k",
            "-t", "20",
            "--no-progress", "--no-color", "-q",
        ]);
        await harness.cleanup();
    });

    it("dir: rejects when url is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-gobuster-dir", {
            wordlist: "/wordlist.txt",
        });
        await harness.cleanup();
    });

    it("dir: rejects when wordlist is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-gobuster-dir", {
            url: "https://example.com",
        });
        await harness.cleanup();
    });

    // --- do-gobuster-dns tests ---

    it("registers the do-gobuster-dns tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-gobuster-dns");
        await harness.cleanup();
    });

    it("dns: passes domain and wordlist with mode prefix", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gobuster-dns", {
            domain: "example.com",
            wordlist: "/wordlist.txt",
        });
        assert.equal(mock.calls.length, 1);
        assert.deepEqual(mock.calls[0].args, [
            "dns", "-d", "example.com", "-w", "/wordlist.txt",
            "--no-progress", "--no-color", "-q",
        ]);
        await harness.cleanup();
    });

    it("dns: appends optional flags correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gobuster-dns", {
            domain: "example.com",
            wordlist: "/wordlist.txt",
            resolver: "8.8.8.8",
            show_ips: true,
            show_cname: true,
            threads: 10,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "dns",
            "-d", "example.com",
            "-w", "/wordlist.txt",
            "-r", "8.8.8.8",
            "-i",
            "-c",
            "-t", "10",
            "--no-progress", "--no-color", "-q",
        ]);
        await harness.cleanup();
    });

    it("dns: rejects when domain is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-gobuster-dns", {
            wordlist: "/wordlist.txt",
        });
        await harness.cleanup();
    });

    // --- do-gobuster-tftp tests ---

    it("registers the do-gobuster-tftp tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-gobuster-tftp");
        await harness.cleanup();
    });

    it("tftp: passes server and wordlist with mode prefix", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gobuster-tftp", {
            server: "192.168.1.1",
            wordlist: "/wordlist.txt",
        });
        assert.equal(mock.calls.length, 1);
        assert.deepEqual(mock.calls[0].args, [
            "tftp", "-s", "192.168.1.1", "-w", "/wordlist.txt",
            "--no-progress", "--no-color", "-q",
        ]);
        await harness.cleanup();
    });

    it("tftp: appends optional flags correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-gobuster-tftp", {
            server: "10.0.0.1",
            wordlist: "/wordlist.txt",
            timeout: "30s",
            threads: 5,
        });
        const last = mock.lastCall();
        assert.deepEqual(last?.args, [
            "tftp",
            "-s", "10.0.0.1",
            "-w", "/wordlist.txt",
            "--timeout", "30s",
            "-t", "5",
            "--no-progress", "--no-color", "-q",
        ]);
        await harness.cleanup();
    });

    it("tftp: rejects when server is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-gobuster-tftp", {
            wordlist: "/wordlist.txt",
        });
        await harness.cleanup();
    });

    // --- Output tests ---

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: { stdout: "/admin (Status: 200)\n/login (Status: 302)", stderr: "", exitCode: 0 },
        });
        const h = createTestServer("gobuster-output");
        h.server.tool(
            "do-gobuster-dir",
            "dir mode",
            { url: z.string(), wordlist: z.string() },
            async ({ url, wordlist }) => {
                const result = await customMock.spawn("gobuster", ["dir", "-u", url, "-w", wordlist]);
                return formatToolResult(result, { toolName: "gobuster" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-gobuster-dir", {
            url: "https://example.com",
            wordlist: "/wordlist.txt",
        });
        const text = getResultText(result);
        assert.ok(text.includes("/admin (Status: 200)"));
        assert.ok(text.includes("/login (Status: 302)"));
        await h.cleanup();
    });
});
