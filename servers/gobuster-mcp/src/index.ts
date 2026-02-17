import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions, registerSecListsTool } from "mcp-shared";
import type { ToolContent } from "mcp-shared";

const args = getToolArgs("gobuster-mcp <gobuster binary>");

const server = new McpServer({
    name: "gobuster",
    version: "1.0.0",
});

async function runGobuster(mode: string, modeArgs: string[], extra: { signal: AbortSignal }, timeoutSeconds?: number): Promise<ToolContent> {
    const result = await secureSpawn(args[0], [mode, ...modeArgs, "--no-progress", "--no-color", "-q"], buildSpawnOptions(extra, { timeoutSeconds }));
    return formatToolResult(result, { toolName: "gobuster" });
}

// Tool 1: dir - Directory/file brute-forcing
server.tool(
    "do-gobuster-dir",
    "Brute-force directories and files on a web server using gobuster dir mode",
    {
        url: z.string().describe("Target URL"),
        wordlist: z.string().describe("Path to wordlist file. SecLists available at /opt/seclists/ (e.g. /opt/seclists/Discovery/Web-Content/common.txt)"),
        extensions: z.string().optional().describe("File extensions to search for, e.g. 'php,html,txt'"),
        extensions_file: z.string().optional().describe("File containing extensions to search for"),
        status_codes: z.string().optional().describe("Positive status codes to match, e.g. '200,204,301'"),
        status_codes_blacklist: z.string().optional().describe("Negative status codes to filter, e.g. '404'"),
        method: z.string().optional().describe("HTTP method to use (default: GET)"),
        headers: z.array(z.string()).optional().describe("HTTP headers, e.g. ['Authorization: Bearer token']"),
        cookies: z.string().optional().describe("Cookies to use for requests"),
        username: z.string().optional().describe("Username for basic auth"),
        password: z.string().optional().describe("Password for basic auth"),
        useragent: z.string().optional().describe("User agent string"),
        random_agent: z.boolean().optional().describe("Use a random user agent"),
        follow_redirect: z.boolean().optional().describe("Follow redirects"),
        add_slash: z.boolean().optional().describe("Append / to each request"),
        discover_backup: z.boolean().optional().describe("Also search for backup files of found files"),
        expanded: z.boolean().optional().describe("Expanded mode, print full URLs"),
        no_status: z.boolean().optional().describe("Don't print status codes"),
        hide_length: z.boolean().optional().describe("Hide the length of the body in output"),
        exclude_length: z.string().optional().describe("Exclude results with these content lengths"),
        no_tls_validation: z.boolean().optional().describe("Skip TLS certificate verification"),
        proxy: z.string().optional().describe("Proxy to use, e.g. http://127.0.0.1:8080"),
        timeout: z.string().optional().describe("HTTP timeout, e.g. '10s'"),
        threads: z.number().optional().describe("Number of concurrent threads"),
        retry: z.boolean().optional().describe("Retry on request timeout"),
        retry_attempts: z.number().optional().describe("Number of retry attempts"),
        no_canonicalize_headers: z.boolean().optional().describe("Do not canonicalize HTTP header names"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ url, wordlist, extensions, extensions_file, status_codes, status_codes_blacklist, method, headers, cookies, username, password, useragent, random_agent, follow_redirect, add_slash, discover_backup, expanded, no_status, hide_length, exclude_length, no_tls_validation, proxy, timeout, threads, retry, retry_attempts, no_canonicalize_headers, timeoutSeconds }, extra) => {
        const gobusterArgs: string[] = [];
        gobusterArgs.push("-u", url);
        gobusterArgs.push("-w", wordlist);
        if (extensions) gobusterArgs.push("-x", extensions);
        if (extensions_file) gobusterArgs.push("-X", extensions_file);
        if (status_codes) gobusterArgs.push("-s", status_codes);
        if (status_codes_blacklist) gobusterArgs.push("-b", status_codes_blacklist);
        if (method) gobusterArgs.push("-m", method);
        if (headers) headers.forEach((h) => gobusterArgs.push("-H", h));
        if (cookies) gobusterArgs.push("-c", cookies);
        if (username) gobusterArgs.push("-U", username);
        if (password) gobusterArgs.push("-P", password);
        if (useragent) gobusterArgs.push("-a", useragent);
        if (random_agent) gobusterArgs.push("--random-agent");
        if (follow_redirect) gobusterArgs.push("-r");
        if (add_slash) gobusterArgs.push("-f");
        if (discover_backup) gobusterArgs.push("-d");
        if (expanded) gobusterArgs.push("-e");
        if (no_status) gobusterArgs.push("-n");
        if (hide_length) gobusterArgs.push("--hide-length");
        if (exclude_length) gobusterArgs.push("--exclude-length", exclude_length);
        if (no_tls_validation) gobusterArgs.push("-k");
        if (proxy) gobusterArgs.push("--proxy", proxy);
        if (timeout) gobusterArgs.push("--timeout", timeout);
        if (threads) gobusterArgs.push("-t", threads.toString());
        if (retry) gobusterArgs.push("--retry");
        if (retry_attempts) gobusterArgs.push("--retry-attempts", retry_attempts.toString());
        if (no_canonicalize_headers) gobusterArgs.push("--no-canonicalize-headers");
        return runGobuster("dir", gobusterArgs, extra, timeoutSeconds);
    },
);

// Tool 2: dns - DNS subdomain enumeration
server.tool(
    "do-gobuster-dns",
    "Enumerate DNS subdomains using gobuster dns mode",
    {
        domain: z.string().describe("Target domain to enumerate subdomains for"),
        wordlist: z.string().describe("Path to wordlist file. SecLists available at /opt/seclists/ (e.g. /opt/seclists/Discovery/Web-Content/common.txt)"),
        resolver: z.string().optional().describe("Custom DNS resolver, e.g. '8.8.8.8'"),
        show_ips: z.boolean().optional().describe("Show IP addresses for discovered subdomains"),
        show_cname: z.boolean().optional().describe("Show CNAME records"),
        no_fqdn: z.boolean().optional().describe("Do not automatically add FQDN dot to domain"),
        wildcard: z.boolean().optional().describe("Force continued operation when wildcard found"),
        timeout: z.string().optional().describe("DNS timeout, e.g. '10s'"),
        threads: z.number().optional().describe("Number of concurrent threads"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ domain, wordlist, resolver, show_ips, show_cname, no_fqdn, wildcard, timeout, threads, timeoutSeconds }, extra) => {
        const gobusterArgs: string[] = [];
        gobusterArgs.push("-d", domain);
        gobusterArgs.push("-w", wordlist);
        if (resolver) gobusterArgs.push("-r", resolver);
        if (show_ips) gobusterArgs.push("-i");
        if (show_cname) gobusterArgs.push("-c");
        if (no_fqdn) gobusterArgs.push("--no-fqdn");
        if (wildcard) gobusterArgs.push("--wildcard");
        if (timeout) gobusterArgs.push("--timeout", timeout);
        if (threads) gobusterArgs.push("-t", threads.toString());
        return runGobuster("dns", gobusterArgs, extra, timeoutSeconds);
    },
);

// Tool 3: vhost - Virtual host discovery
server.tool(
    "do-gobuster-vhost",
    "Discover virtual hosts on a web server using gobuster vhost mode",
    {
        url: z.string().describe("Target URL"),
        wordlist: z.string().describe("Path to wordlist file. SecLists available at /opt/seclists/ (e.g. /opt/seclists/Discovery/Web-Content/common.txt)"),
        domain: z.string().optional().describe("Domain to append to wordlist entries"),
        append_domain: z.boolean().optional().describe("Append domain from base URL to wordlist entries"),
        method: z.string().optional().describe("HTTP method to use (default: GET)"),
        headers: z.array(z.string()).optional().describe("HTTP headers"),
        cookies: z.string().optional().describe("Cookies to use for requests"),
        username: z.string().optional().describe("Username for basic auth"),
        password: z.string().optional().describe("Password for basic auth"),
        useragent: z.string().optional().describe("User agent string"),
        random_agent: z.boolean().optional().describe("Use a random user agent"),
        follow_redirect: z.boolean().optional().describe("Follow redirects"),
        exclude_length: z.string().optional().describe("Exclude results with these content lengths"),
        no_tls_validation: z.boolean().optional().describe("Skip TLS certificate verification"),
        proxy: z.string().optional().describe("Proxy to use"),
        timeout: z.string().optional().describe("HTTP timeout, e.g. '10s'"),
        threads: z.number().optional().describe("Number of concurrent threads"),
        retry: z.boolean().optional().describe("Retry on request timeout"),
        retry_attempts: z.number().optional().describe("Number of retry attempts"),
        no_canonicalize_headers: z.boolean().optional().describe("Do not canonicalize HTTP header names"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ url, wordlist, domain, append_domain, method, headers, cookies, username, password, useragent, random_agent, follow_redirect, exclude_length, no_tls_validation, proxy, timeout, threads, retry, retry_attempts, no_canonicalize_headers, timeoutSeconds }, extra) => {
        const gobusterArgs: string[] = [];
        gobusterArgs.push("-u", url);
        gobusterArgs.push("-w", wordlist);
        if (domain) gobusterArgs.push("--domain", domain);
        if (append_domain) gobusterArgs.push("--append-domain");
        if (method) gobusterArgs.push("-m", method);
        if (headers) headers.forEach((h) => gobusterArgs.push("-H", h));
        if (cookies) gobusterArgs.push("-c", cookies);
        if (username) gobusterArgs.push("-U", username);
        if (password) gobusterArgs.push("-P", password);
        if (useragent) gobusterArgs.push("-a", useragent);
        if (random_agent) gobusterArgs.push("--random-agent");
        if (follow_redirect) gobusterArgs.push("-r");
        if (exclude_length) gobusterArgs.push("--exclude-length", exclude_length);
        if (no_tls_validation) gobusterArgs.push("-k");
        if (proxy) gobusterArgs.push("--proxy", proxy);
        if (timeout) gobusterArgs.push("--timeout", timeout);
        if (threads) gobusterArgs.push("-t", threads.toString());
        if (retry) gobusterArgs.push("--retry");
        if (retry_attempts) gobusterArgs.push("--retry-attempts", retry_attempts.toString());
        if (no_canonicalize_headers) gobusterArgs.push("--no-canonicalize-headers");
        return runGobuster("vhost", gobusterArgs, extra, timeoutSeconds);
    },
);

// Tool 4: fuzz - General fuzzing with FUZZ keyword
server.tool(
    "do-gobuster-fuzz",
    "Fuzz URLs using the FUZZ keyword with gobuster fuzz mode",
    {
        url: z.string().describe("Target URL containing FUZZ keyword"),
        wordlist: z.string().describe("Path to wordlist file. SecLists available at /opt/seclists/ (e.g. /opt/seclists/Discovery/Web-Content/common.txt)"),
        body: z.string().optional().describe("Request body (can contain FUZZ keyword)"),
        exclude_status_codes: z.string().optional().describe("Status codes to exclude, e.g. '404,403'"),
        method: z.string().optional().describe("HTTP method to use (default: GET)"),
        headers: z.array(z.string()).optional().describe("HTTP headers"),
        cookies: z.string().optional().describe("Cookies to use for requests"),
        username: z.string().optional().describe("Username for basic auth"),
        password: z.string().optional().describe("Password for basic auth"),
        useragent: z.string().optional().describe("User agent string"),
        random_agent: z.boolean().optional().describe("Use a random user agent"),
        follow_redirect: z.boolean().optional().describe("Follow redirects"),
        exclude_length: z.string().optional().describe("Exclude results with these content lengths"),
        no_tls_validation: z.boolean().optional().describe("Skip TLS certificate verification"),
        proxy: z.string().optional().describe("Proxy to use"),
        timeout: z.string().optional().describe("HTTP timeout, e.g. '10s'"),
        threads: z.number().optional().describe("Number of concurrent threads"),
        retry: z.boolean().optional().describe("Retry on request timeout"),
        retry_attempts: z.number().optional().describe("Number of retry attempts"),
        no_canonicalize_headers: z.boolean().optional().describe("Do not canonicalize HTTP header names"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ url, wordlist, body, exclude_status_codes, method, headers, cookies, username, password, useragent, random_agent, follow_redirect, exclude_length, no_tls_validation, proxy, timeout, threads, retry, retry_attempts, no_canonicalize_headers, timeoutSeconds }, extra) => {
        const gobusterArgs: string[] = [];
        gobusterArgs.push("-u", url);
        gobusterArgs.push("-w", wordlist);
        if (body) gobusterArgs.push("-B", body);
        if (exclude_status_codes) gobusterArgs.push("-b", exclude_status_codes);
        if (method) gobusterArgs.push("-m", method);
        if (headers) headers.forEach((h) => gobusterArgs.push("-H", h));
        if (cookies) gobusterArgs.push("-c", cookies);
        if (username) gobusterArgs.push("-U", username);
        if (password) gobusterArgs.push("-P", password);
        if (useragent) gobusterArgs.push("-a", useragent);
        if (random_agent) gobusterArgs.push("--random-agent");
        if (follow_redirect) gobusterArgs.push("-r");
        if (exclude_length) gobusterArgs.push("--exclude-length", exclude_length);
        if (no_tls_validation) gobusterArgs.push("-k");
        if (proxy) gobusterArgs.push("--proxy", proxy);
        if (timeout) gobusterArgs.push("--timeout", timeout);
        if (threads) gobusterArgs.push("-t", threads.toString());
        if (retry) gobusterArgs.push("--retry");
        if (retry_attempts) gobusterArgs.push("--retry-attempts", retry_attempts.toString());
        if (no_canonicalize_headers) gobusterArgs.push("--no-canonicalize-headers");
        return runGobuster("fuzz", gobusterArgs, extra, timeoutSeconds);
    },
);

// Tool 5: s3 - AWS S3 bucket enumeration
server.tool(
    "do-gobuster-s3",
    "Enumerate AWS S3 buckets using gobuster s3 mode",
    {
        wordlist: z.string().describe("Path to wordlist file. SecLists available at /opt/seclists/ (e.g. /opt/seclists/Discovery/Web-Content/common.txt)"),
        maxfiles: z.number().optional().describe("Max files to list when listing buckets (default: 5)"),
        useragent: z.string().optional().describe("User agent string"),
        random_agent: z.boolean().optional().describe("Use a random user agent"),
        no_tls_validation: z.boolean().optional().describe("Skip TLS certificate verification"),
        proxy: z.string().optional().describe("Proxy to use"),
        timeout: z.string().optional().describe("HTTP timeout, e.g. '10s'"),
        threads: z.number().optional().describe("Number of concurrent threads"),
        retry: z.boolean().optional().describe("Retry on request timeout"),
        retry_attempts: z.number().optional().describe("Number of retry attempts"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ wordlist, maxfiles, useragent, random_agent, no_tls_validation, proxy, timeout, threads, retry, retry_attempts, timeoutSeconds }, extra) => {
        const gobusterArgs: string[] = [];
        gobusterArgs.push("-w", wordlist);
        if (maxfiles) gobusterArgs.push("-m", maxfiles.toString());
        if (useragent) gobusterArgs.push("-a", useragent);
        if (random_agent) gobusterArgs.push("--random-agent");
        if (no_tls_validation) gobusterArgs.push("-k");
        if (proxy) gobusterArgs.push("--proxy", proxy);
        if (timeout) gobusterArgs.push("--timeout", timeout);
        if (threads) gobusterArgs.push("-t", threads.toString());
        if (retry) gobusterArgs.push("--retry");
        if (retry_attempts) gobusterArgs.push("--retry-attempts", retry_attempts.toString());
        return runGobuster("s3", gobusterArgs, extra, timeoutSeconds);
    },
);

// Tool 6: gcs - Google Cloud Storage bucket enumeration
server.tool(
    "do-gobuster-gcs",
    "Enumerate Google Cloud Storage buckets using gobuster gcs mode",
    {
        wordlist: z.string().describe("Path to wordlist file. SecLists available at /opt/seclists/ (e.g. /opt/seclists/Discovery/Web-Content/common.txt)"),
        maxfiles: z.number().optional().describe("Max files to list when listing buckets (default: 5)"),
        useragent: z.string().optional().describe("User agent string"),
        random_agent: z.boolean().optional().describe("Use a random user agent"),
        no_tls_validation: z.boolean().optional().describe("Skip TLS certificate verification"),
        proxy: z.string().optional().describe("Proxy to use"),
        timeout: z.string().optional().describe("HTTP timeout, e.g. '10s'"),
        threads: z.number().optional().describe("Number of concurrent threads"),
        retry: z.boolean().optional().describe("Retry on request timeout"),
        retry_attempts: z.number().optional().describe("Number of retry attempts"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ wordlist, maxfiles, useragent, random_agent, no_tls_validation, proxy, timeout, threads, retry, retry_attempts, timeoutSeconds }, extra) => {
        const gobusterArgs: string[] = [];
        gobusterArgs.push("-w", wordlist);
        if (maxfiles) gobusterArgs.push("-m", maxfiles.toString());
        if (useragent) gobusterArgs.push("-a", useragent);
        if (random_agent) gobusterArgs.push("--random-agent");
        if (no_tls_validation) gobusterArgs.push("-k");
        if (proxy) gobusterArgs.push("--proxy", proxy);
        if (timeout) gobusterArgs.push("--timeout", timeout);
        if (threads) gobusterArgs.push("-t", threads.toString());
        if (retry) gobusterArgs.push("--retry");
        if (retry_attempts) gobusterArgs.push("--retry-attempts", retry_attempts.toString());
        return runGobuster("gcs", gobusterArgs, extra, timeoutSeconds);
    },
);

// Tool 7: tftp - TFTP enumeration
server.tool(
    "do-gobuster-tftp",
    "Enumerate TFTP servers using gobuster tftp mode",
    {
        server: z.string().describe("Target TFTP server address"),
        wordlist: z.string().describe("Path to wordlist file. SecLists available at /opt/seclists/ (e.g. /opt/seclists/Discovery/Web-Content/common.txt)"),
        timeout: z.string().optional().describe("TFTP timeout, e.g. '10s'"),
        threads: z.number().optional().describe("Number of concurrent threads"),
        ...TIMEOUT_SCHEMA,
    },
    async ({ server: tftpServer, wordlist, timeout, threads, timeoutSeconds }, extra) => {
        const gobusterArgs: string[] = [];
        gobusterArgs.push("-s", tftpServer);
        gobusterArgs.push("-w", wordlist);
        if (timeout) gobusterArgs.push("--timeout", timeout);
        if (threads) gobusterArgs.push("-t", threads.toString());
        return runGobuster("tftp", gobusterArgs, extra, timeoutSeconds);
    },
);

registerSecListsTool(server);

async function main() {
    await startServer(server);
    console.error("gobuster MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
