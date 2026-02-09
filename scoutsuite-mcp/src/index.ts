import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, removeAnsiCodes, startServer, getToolArgs } from "mcp-shared";
import { getFindingsFromScoutSuite, extractReportJsPath } from './parser.js';

const args = getToolArgs("scoutsuite-mcp <scoutsuite binary>");

const server = new McpServer({
    name: "scoutsuite",
    version: "1.0.0",
});

server.tool(
    "do-scoutsuite-aws",
    "Performs an AWS cloud security audit using Scout Suite, allowing service/region filtering and multiple authentication methods.",
    {
        full_report: z.boolean().default(false).optional().describe("Return full findings details instead of summary"),
        max_workers: z.number().optional().describe("Maximum parallel worker threads (default: 10)"),
        services: z.array(z.string()).optional().describe("AWS services to include in scope (default: all)"),
        skip_services: z.array(z.string()).optional().describe("AWS services to exclude from scope"),
        profile: z.string().optional().describe("Named AWS CLI profile for authentication"),
        acces_keys: z.string().optional().describe("Run using access keys instead of profile"),
        access_key_id: z.string().optional().describe("AWS Access Key ID (or set AWS_ACCESS_KEY_ID env var)"),
        secret_acces_key: z.string().optional().describe("AWS Secret Access Key (or set AWS_SECRET_ACCESS_KEY env var)"),
        session_token: z.string().optional().describe("Temporary AWS session token (or set AWS_SESSION_TOKEN env var)"),
        regions: z.string().optional().describe("Comma-separated AWS regions to include"),
        exclude_regions: z.string().optional().describe("Comma-separated AWS regions to exclude"),
        ip_ranges: z.string().optional().describe("Path to JSON file with known IP ranges"),
        ip_ranges_name_key: z.string().optional().describe("Key in IP ranges file for display name")
    },
    async ({ full_report, max_workers, services, skip_services, profile, acces_keys, access_key_id, secret_acces_key, session_token, regions, exclude_regions, ip_ranges, ip_ranges_name_key }) => {
        const scoutSuiteArgs = ["aws", "--force", "--no-browser"];

        if (max_workers) scoutSuiteArgs.push("--max-workers", max_workers.toString());
        if (services?.length) {
            scoutSuiteArgs.push("--services");
            for (const s of services) scoutSuiteArgs.push(s);
        }
        if (skip_services?.length) {
            scoutSuiteArgs.push("--skip");
            for (const s of skip_services) scoutSuiteArgs.push(s);
        }
        if (profile) scoutSuiteArgs.push("--profile", profile);
        if (acces_keys) scoutSuiteArgs.push("--access-keys");

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
            timeoutMs: 600_000,
        });

        const output = removeAnsiCodes(result.stdout + result.stderr);

        if (result.exitCode !== 0) {
            throw new Error(`scoutsuite exited with code ${result.exitCode}:\n${output}`);
        }

        const reportPath = extractReportJsPath(output);
        if (!reportPath) {
            throw new Error("Could not extract report path from ScoutSuite output");
        }

        const findings = getFindingsFromScoutSuite(reportPath, full_report as any);

        return {
            content: [{
                type: "text" as const,
                text: JSON.stringify(findings, null, 2)
            }]
        };
    },
);

async function main() {
    await startServer(server);
    console.error("scoutsuite MCP Server running");
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
