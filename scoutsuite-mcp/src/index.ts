import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, removeAnsiCodes, getEnvOrArg, startServer } from "mcp-shared";
const { getFindingsFromScoutSuite, extractReportJsPath } = require('./parser');

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: scoutsuite-mcp <scoutsuite binary>");
    process.exit(1);
}

// Create server instance
const server = new McpServer({
    name: "scoutsuite",
    version: "1.0.0",
});

server.tool(
    "do-scoutsuite-aws",
    "Performs an AWS cloud security audit using Scout Suite for the given target settings, allowing service/region filtering and multiple authentication methods.",
    {
        full_report: z.boolean().default(false).optional().describe(""),
        max_workers: z.number().optional().describe("Maximum number of parallel worker threads used by Scout Suite (default: 10)"),
        services: z.array(z.string()).optional().describe("A list of AWS service names to include in scope (default: all services)"),
        skip_services: z.array(z.string()).optional().describe("A list of AWS service names to exclude from scope"),
        profile: z.string().optional().describe("Use a named AWS CLI profile for authentication"),
        acces_keys: z.string().optional().describe("Run using access keys instead of profile (use access_key_id, secret_access_key, and optionally session_token)"),
        access_key_id: z.string().optional().describe("AWS Access Key ID used for authentication (or set AWS_ACCESS_KEY_ID env var)"),
        secret_acces_key: z.string().optional().describe("AWS Secret Access Key used for authentication (or set AWS_SECRET_ACCESS_KEY env var)"),
        session_token: z.string().optional().describe("Temporary AWS session token (or set AWS_SESSION_TOKEN env var)"),
        regions: z.string().optional().describe("Comma-separated list of AWS regions to include in the scan (default: all regions)"),
        exclude_regions: z.string().optional().describe("Comma-separated list of AWS regions to exclude from the scan"),
        ip_ranges: z.string().optional().describe("Path to JSON file(s) containing known IP ranges to match findings against"),
        ip_ranges_name_key: z.string().optional().describe("Key in the IP ranges file that maps to the display name of a known CIDR")
    },
    async ({ full_report, max_workers, services, skip_services, profile, acces_keys, access_key_id, secret_acces_key, session_token, regions, exclude_regions, ip_ranges, ip_ranges_name_key }) => {

        const scoutSuiteArgs = ["aws", "--force", "--no-browser"];

        if (max_workers) scoutSuiteArgs.push("--max-workers", max_workers.toString());
        if (services?.length) {
            scoutSuiteArgs.push("--services");
            for (let i = 0; i < services.length; i++) {
                scoutSuiteArgs.push(services[i]);
            }
        }

        if (skip_services?.length) {
            scoutSuiteArgs.push("--skip");
            for (let i = 0; i < skip_services.length; i++) {
                scoutSuiteArgs.push(skip_services[i]);
            }
        }
        if (profile) scoutSuiteArgs.push("--profile", profile);
        if (acces_keys) scoutSuiteArgs.push("--access-keys");

        // Prefer env vars for credentials, fall back to parameters
        const keyId = process.env.AWS_ACCESS_KEY_ID || access_key_id;
        const secretKey = process.env.AWS_SECRET_ACCESS_KEY || secret_acces_key;
        const sessToken = process.env.AWS_SESSION_TOKEN || session_token;

        if (keyId) scoutSuiteArgs.push("--access-key-id", keyId);
        if (secretKey) scoutSuiteArgs.push("--secret-access-key", secretKey);
        if (sessToken) scoutSuiteArgs.push("--session-token", sessToken);
        if (regions) scoutSuiteArgs.push("--regions", regions);
        if (exclude_regions) scoutSuiteArgs.push("--exclude-regions", exclude_regions);
        if (ip_ranges) scoutSuiteArgs.push("--ip-ranges", ip_ranges);
        if (ip_ranges_name_key) scoutSuiteArgs.push("--ip-ranges-name-key", ip_ranges_name_key);

        const result = await secureSpawn(args[0], scoutSuiteArgs, {
            timeoutMs: 600_000, // ScoutSuite scans can take a while — 10 min
        });

        const output = removeAnsiCodes(result.stdout + result.stderr);

        if (result.exitCode !== 0) {
            throw new Error(`scoutsuite exited with code ${result.exitCode}:\n${output}`);
        }

        const reportPath = extractReportJsPath(output);
        if (!reportPath) {
            throw new Error("Could not extract report path from ScoutSuite output");
        }

        const findings = getFindingsFromScoutSuite(reportPath, full_report);

        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(findings, null, 2)
            }]
        };
    },
);

// Start the server
async function main() {
    await startServer(server);
    console.error("scoutsuite MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
