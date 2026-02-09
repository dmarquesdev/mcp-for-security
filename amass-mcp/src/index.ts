import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer, getToolArgs, formatToolResult } from "mcp-shared";

const args = getToolArgs("amass-mcp <amass binary>");

const server = new McpServer({
    name: "amass",
    version: "1.0.0",
});

server.tool(
    "do-amass",
    "Advanced subdomain enumeration and reconnaissance tool",
    {
        subcommand: z.enum(["enum", "intel"]).describe("Amass operation mode: intel (gather intelligence) or enum (subdomain enumeration)"),
        domain: z.string().optional().describe("Target domain (e.g., example.com)"),
        intel_whois: z.boolean().optional().describe("Include WHOIS data in intelligence gathering"),
        intel_organization: z.string().optional().describe("Organization name to search for"),
        enum_type: z.enum(["active", "passive"]).optional().describe("Enumeration approach: active or passive"),
        enum_brute: z.boolean().optional().describe("Perform brute force subdomain discovery"),
        enum_brute_wordlist: z.string().optional().describe("Path to custom wordlist for brute force")
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

        console.error(`Executing: amass ${amassArgs.join(' ')}`);

        const result = await secureSpawn(args[0], amassArgs);
        return formatToolResult(result, { toolName: "amass", includeStderr: true });
    },
);

async function main() {
    await startServer(server);
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
