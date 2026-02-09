import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { existsSync, statSync } from "fs";
import { join } from "path";
import { secureSpawn, removeAnsiCodes, sanitizePath, startServer } from "mcp-shared";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: testssl-mcp <path-to-testssl.sh>");
    process.exit(1);
}

// If path is the testssl.sh directory (e.g. ~/tools/testssl.sh), run the script inside it
function resolveTestsslPath(rawPath: string): string {
    if (existsSync(rawPath) && statSync(rawPath).isDirectory()) {
        return join(rawPath, "testssl.sh");
    }
    return rawPath;
}
const testsslPath = resolveTestsslPath(args[0]);

const server = new McpServer({
    name: "testssl",
    version: "1.0.0",
});

async function runTestssl(testsslArgs: string[], target?: string): Promise<{ content: { type: "text"; text: string }[] }> {
    const finalArgs = ["--color", "0", ...testsslArgs];
    if (target) finalArgs.push(target);

    const result = await secureSpawn(testsslPath, finalArgs);
    const output = removeAnsiCodes(result.stdout + result.stderr);

    if (result.exitCode === 0) {
        return {
            content: [{ type: "text", text: output || "testssl completed with no output" }],
        };
    } else {
        throw new Error(`testssl exited with code ${result.exitCode}: ${output}`);
    }
}

// Shared option interfaces and arg builders

interface ConnectionParams {
    starttls?: string;
    xmpphost?: string;
    proxy?: string;
    ip?: string;
    ipv6?: boolean;
    connect_timeout?: number;
    openssl_timeout?: number;
    basicauth?: string;
    reqheader?: string[];
    sneaky?: boolean;
    bugs?: boolean;
    assume_http?: boolean;
    phone_out?: boolean;
    ids_friendly?: boolean;
}

interface OutputParams {
    quiet?: boolean;
    wide?: boolean;
    jsonfile?: string;
    jsonfile_pretty?: string;
    csvfile?: string;
    htmlfile?: string;
    logfile?: string;
    severity?: string;
    append?: boolean;
    overwrite?: boolean;
}

function addConnectionArgs(a: string[], p: ConnectionParams): void {
    if (p.starttls) a.push("--starttls", p.starttls);
    if (p.xmpphost) a.push("--xmpphost", p.xmpphost);
    if (p.proxy) a.push("--proxy", p.proxy);
    if (p.ip) a.push("--ip", p.ip);
    if (p.ipv6) a.push("-6");
    if (p.connect_timeout) a.push("--connect-timeout", p.connect_timeout.toString());
    if (p.openssl_timeout) a.push("--openssl-timeout", p.openssl_timeout.toString());
    if (p.basicauth) a.push("--basicauth", p.basicauth);
    if (p.reqheader) p.reqheader.forEach((h) => a.push("--reqheader", h));
    if (p.sneaky) a.push("--sneaky");
    if (p.bugs) a.push("--bugs");
    if (p.assume_http) a.push("--assume-http");
    if (p.phone_out) a.push("--phone-out");
    if (p.ids_friendly) a.push("--ids-friendly");
}

function addOutputArgs(a: string[], p: OutputParams): void {
    const cwd = process.cwd();
    if (p.quiet) a.push("-q");
    if (p.wide) a.push("--wide");
    if (p.jsonfile) a.push("--jsonfile", sanitizePath(p.jsonfile, cwd));
    if (p.jsonfile_pretty) a.push("--jsonfile-pretty", sanitizePath(p.jsonfile_pretty, cwd));
    if (p.csvfile) a.push("--csvfile", sanitizePath(p.csvfile, cwd));
    if (p.htmlfile) a.push("--htmlfile", sanitizePath(p.htmlfile, cwd));
    if (p.logfile) a.push("--logfile", sanitizePath(p.logfile, cwd));
    if (p.severity) a.push("--severity", p.severity);
    if (p.append) a.push("--append");
    if (p.overwrite) a.push("--overwrite");
}

// Shared Zod schemas for reuse
const connectionSchema = {
    starttls: z.enum(["smtp", "pop3", "imap", "ftp", "ldap", "nntp", "postgres", "mysql", "xmpp", "xmpp-server", "telnet", "irc", "lmtp", "sieve"]).optional().describe("Use STARTTLS for the specified protocol"),
    xmpphost: z.string().optional().describe("XMPP host for STARTTLS"),
    proxy: z.string().optional().describe("Proxy to use (host:port)"),
    ip: z.string().optional().describe("IP address to connect to (one of: IP, hostname, lastIP)"),
    ipv6: z.boolean().optional().describe("Use IPv6 instead of IPv4"),
    connect_timeout: z.number().optional().describe("Connection timeout in seconds"),
    openssl_timeout: z.number().optional().describe("Timeout for openssl s_client connections in seconds"),
    basicauth: z.string().optional().describe("Basic auth credentials (user:pass)"),
    reqheader: z.array(z.string()).optional().describe("Additional HTTP request headers"),
    sneaky: z.boolean().optional().describe("Use a less conspicuous User-Agent"),
    bugs: z.boolean().optional().describe("Enable various bug workarounds"),
    assume_http: z.boolean().optional().describe("Assume HTTP even if not detected"),
    phone_out: z.boolean().optional().describe("Allow DNS lookups and other external checks"),
    ids_friendly: z.boolean().optional().describe("Use IDS-friendly timing"),
};

const outputSchema = {
    quiet: z.boolean().optional().describe("Suppress output to stdout"),
    wide: z.boolean().optional().describe("Wide output for ciphers"),
    jsonfile: z.string().optional().describe("Path for JSON output file"),
    jsonfile_pretty: z.string().optional().describe("Path for pretty-printed JSON output file"),
    csvfile: z.string().optional().describe("Path for CSV output file"),
    htmlfile: z.string().optional().describe("Path for HTML output file"),
    logfile: z.string().optional().describe("Path for log file"),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional().describe("Minimum severity level to display"),
    append: z.boolean().optional().describe("Append to output files instead of overwriting"),
    overwrite: z.boolean().optional().describe("Overwrite existing output files"),
};

// Tool 1: do-testssl — Full comprehensive scan
server.tool(
    "do-testssl",
    "Run a comprehensive TLS/SSL scan with testssl.sh — tests all protocols, ciphers, vulnerabilities, certificates, and HTTP headers. This is the primary tool for full analysis.",
    {
        target: z.string().describe("Target host:port or URL to scan (e.g. 'example.com:443' or 'https://example.com')"),
        ...connectionSchema,
        ...outputSchema,
    },
    async (params) => {
        const a: string[] = [];
        addConnectionArgs(a, params);
        addOutputArgs(a, params);
        return runTestssl(a, params.target);
    },
);

// Tool 2: do-testssl-protocols — Protocol version testing
server.tool(
    "do-testssl-protocols",
    "Test which TLS/SSL protocol versions are supported (SSLv2, SSLv3, TLS 1.0-1.3, NPN/ALPN)",
    {
        target: z.string().describe("Target host:port or URL to scan"),
        ...connectionSchema,
        ...outputSchema,
    },
    async (params) => {
        const a: string[] = ["-p"];
        addConnectionArgs(a, params);
        addOutputArgs(a, params);
        return runTestssl(a, params.target);
    },
);

// Tool 3: do-testssl-ciphers — Cipher suite analysis
server.tool(
    "do-testssl-ciphers",
    "Analyze cipher suites supported by the target — standard list, per-cipher, per-protocol, forward secrecy, or server preference",
    {
        target: z.string().describe("Target host:port or URL to scan"),
        test_mode: z.enum(["standard", "each-cipher", "cipher-per-proto", "forward-secrecy", "server-preference"]).describe("Cipher test mode: standard (-s), each-cipher (-e), cipher-per-proto (-E), forward-secrecy (-f), server-preference (-P)"),
        cipher_pattern: z.string().optional().describe("Test only ciphers matching this pattern (with -x flag)"),
        show_each: z.boolean().optional().describe("Show each cipher tested, not just supported ones"),
        ...connectionSchema,
        ...outputSchema,
    },
    async (params) => {
        const modeMap: Record<string, string> = {
            "standard": "-s",
            "each-cipher": "-e",
            "cipher-per-proto": "-E",
            "forward-secrecy": "-f",
            "server-preference": "-P",
        };
        const a: string[] = [modeMap[params.test_mode]];
        if (params.cipher_pattern) a.push("-x", params.cipher_pattern);
        if (params.show_each) a.push("--show-each");
        addConnectionArgs(a, params);
        addOutputArgs(a, params);
        return runTestssl(a, params.target);
    },
);

// Tool 4: do-testssl-vulnerabilities — Vulnerability scanning
server.tool(
    "do-testssl-vulnerabilities",
    "Test for TLS/SSL vulnerabilities — Heartbleed, CCS Injection, Ticketbleed, ROBOT, POODLE, DROWN, FREAK, Logjam, BEAST, CRIME, BREACH, Sweet32, Lucky13, RC4, and more",
    {
        target: z.string().describe("Target host:port or URL to scan"),
        test_all: z.boolean().optional().describe("Test all vulnerabilities (-U)"),
        heartbleed: z.boolean().optional().describe("Test for Heartbleed (-H)"),
        ccs_injection: z.boolean().optional().describe("Test for CCS Injection (-I)"),
        ticketbleed: z.boolean().optional().describe("Test for Ticketbleed (-T)"),
        robot: z.boolean().optional().describe("Test for ROBOT vulnerability (--BB)"),
        starttls_injection: z.boolean().optional().describe("Test for STARTTLS injection (--SI)"),
        renegotiation: z.boolean().optional().describe("Test for secure renegotiation (-R)"),
        crime: z.boolean().optional().describe("Test for CRIME (-C)"),
        breach: z.boolean().optional().describe("Test for BREACH (-B)"),
        poodle: z.boolean().optional().describe("Test for POODLE (-O)"),
        tls_fallback: z.boolean().optional().describe("Test for TLS_FALLBACK_SCSV (-Z)"),
        sweet32: z.boolean().optional().describe("Test for Sweet32 (-W)"),
        freak: z.boolean().optional().describe("Test for FREAK (-F)"),
        drown: z.boolean().optional().describe("Test for DROWN (-D)"),
        logjam: z.boolean().optional().describe("Test for Logjam (-J)"),
        beast: z.boolean().optional().describe("Test for BEAST (-A)"),
        lucky13: z.boolean().optional().describe("Test for Lucky13 (-L)"),
        winshock: z.boolean().optional().describe("Test for Winshock (-WS)"),
        rc4: z.boolean().optional().describe("Test for RC4 ciphers (-4)"),
        ...connectionSchema,
        ...outputSchema,
    },
    async (params) => {
        const a: string[] = [];
        let hasVulnFlag = false;

        if (params.test_all) { a.push("-U"); hasVulnFlag = true; }
        if (params.heartbleed) { a.push("-H"); hasVulnFlag = true; }
        if (params.ccs_injection) { a.push("-I"); hasVulnFlag = true; }
        if (params.ticketbleed) { a.push("-T"); hasVulnFlag = true; }
        if (params.robot) { a.push("--BB"); hasVulnFlag = true; }
        if (params.starttls_injection) { a.push("--SI"); hasVulnFlag = true; }
        if (params.renegotiation) { a.push("-R"); hasVulnFlag = true; }
        if (params.crime) { a.push("-C"); hasVulnFlag = true; }
        if (params.breach) { a.push("-B"); hasVulnFlag = true; }
        if (params.poodle) { a.push("-O"); hasVulnFlag = true; }
        if (params.tls_fallback) { a.push("-Z"); hasVulnFlag = true; }
        if (params.sweet32) { a.push("-W"); hasVulnFlag = true; }
        if (params.freak) { a.push("-F"); hasVulnFlag = true; }
        if (params.drown) { a.push("-D"); hasVulnFlag = true; }
        if (params.logjam) { a.push("-J"); hasVulnFlag = true; }
        if (params.beast) { a.push("-A"); hasVulnFlag = true; }
        if (params.lucky13) { a.push("-L"); hasVulnFlag = true; }
        if (params.winshock) { a.push("-WS"); hasVulnFlag = true; }
        if (params.rc4) { a.push("-4"); hasVulnFlag = true; }

        // Default to all vulns if no specific flag set
        if (!hasVulnFlag) a.push("-U");

        addConnectionArgs(a, params);
        addOutputArgs(a, params);
        return runTestssl(a, params.target);
    },
);

// Tool 5: do-testssl-server-info — Server defaults, certs, headers
server.tool(
    "do-testssl-server-info",
    "Retrieve server defaults, certificate information, HTTP security headers, client simulation, and GREASE testing",
    {
        target: z.string().describe("Target host:port or URL to scan"),
        server_defaults: z.boolean().optional().describe("Show server defaults and certificate info (-S)"),
        headers: z.boolean().optional().describe("Test HTTP security headers (-h)"),
        client_simulation: z.boolean().optional().describe("Run client simulation (-c)"),
        grease: z.boolean().optional().describe("Test GREASE (Generate Random Extensions And Sustain Extensibility) (-g)"),
        ...connectionSchema,
        ...outputSchema,
    },
    async (params) => {
        const a: string[] = [];
        let hasTestFlag = false;

        if (params.server_defaults) { a.push("-S"); hasTestFlag = true; }
        if (params.headers) { a.push("-h"); hasTestFlag = true; }
        if (params.client_simulation) { a.push("-c"); hasTestFlag = true; }
        if (params.grease) { a.push("-g"); hasTestFlag = true; }

        // Default to server defaults + headers if no specific flag set
        if (!hasTestFlag) {
            a.push("-S", "-h");
        }

        addConnectionArgs(a, params);
        addOutputArgs(a, params);
        return runTestssl(a, params.target);
    },
);

// Tool 6: do-testssl-mass-scan — Batch scanning from file
server.tool(
    "do-testssl-mass-scan",
    "Batch scan multiple targets from a file — one target per line (host:port or URL). Supports serial or parallel execution.",
    {
        file_path: z.string().describe("Path to file containing targets (one per line)"),
        mode: z.enum(["serial", "parallel"]).optional().describe("Execution mode: serial or parallel"),
        warnings: z.enum(["batch", "off"]).optional().describe("Warning handling: batch (non-interactive) or off"),
        ...connectionSchema,
        ...outputSchema,
    },
    async (params) => {
        // Validate file_path stays within cwd
        const safeFilePath = sanitizePath(params.file_path, process.cwd());
        const a: string[] = ["--file", safeFilePath];

        if (params.mode === "serial") a.push("--serial");
        if (params.mode === "parallel") a.push("--parallel");

        // Default to batch mode for non-interactive use
        if (params.warnings) {
            a.push("--warnings", params.warnings);
        } else {
            a.push("--warnings", "batch");
        }

        addConnectionArgs(a, params);
        addOutputArgs(a, params);
        return runTestssl(a);
    },
);

async function main() {
    await startServer(server);
    console.error("testssl MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
