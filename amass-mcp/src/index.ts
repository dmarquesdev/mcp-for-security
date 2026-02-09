import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { secureSpawn, startServer } from "mcp-shared";

const args = process.argv.slice(2);
if (args.length === 0) {
    console.error("Usage: amass-mcp <amass binary>");
    process.exit(1);
}

// Create server instance
const server = new McpServer({
    name: "amass",
    version: "1.0.0",
});

server.tool(
    "amass",
    "Advanced subdomain enumeration and reconnaissance tool",
    {
        subcommand: z.enum(["enum", "intel"]).describe(`Specify the Amass operation mode:
            - intel: Gather intelligence about target domains from various sources
            - enum: Perform subdomain enumeration and network mapping`),
        domain: z.string().optional().describe("Target domain to perform reconnaissance against (e.g., example.com)"),
        intel_whois: z.boolean().optional().describe("Whether to include WHOIS data in intelligence gathering (true/false)"),
        intel_organization: z.string().optional().describe("Organization name to search for during intelligence gathering (e.g., 'Example Corp')"),
        enum_type: z.enum(["active", "passive"]).optional().describe(`Enumeration approach type:
            - active: Includes DNS resolution and potential network interactions with target
            - passive: Only uses information from third-party sources without direct target interaction`),
        enum_brute: z.boolean().optional().describe("Whether to perform brute force subdomain discovery (true/false)"),
        enum_brute_wordlist: z.string().optional().describe("Path to custom wordlist file for brute force operations (e.g., '/path/to/wordlist.txt')")


    },
    async ({ subcommand, domain, intel_whois, intel_organization, enum_type, enum_brute, enum_brute_wordlist }) => {
        let amassArgs: string[] = [subcommand];

        // Handle different subcommands
        if (subcommand === "enum") {
            if (!domain) {
                throw new Error("Domain parameter is required for 'enum' subcommand");
            }

            amassArgs.push("-d", domain);

            // Handle enum type
            if (enum_type === "passive") {
                amassArgs.push("-passive");
            } else if (enum_type === "active") {
                // Active is default, but can be explicitly specified if needed
            }

            // Handle brute force options
            if (enum_brute === true) {
                amassArgs.push("-brute");

                // Add custom wordlist if provided
                if (enum_brute_wordlist) {
                    amassArgs.push("-w", enum_brute_wordlist);
                }
            }
        }
        else if (subcommand === "intel") {
            if (!domain && !intel_organization) {
                throw new Error("Either domain or organization parameter is required for 'intel' subcommand");
            }

            // Add domain if provided
            if (domain) {
                amassArgs.push("-d", domain);
                // Add whois option if enabled
                if (intel_whois !== true) {

                    throw new Error("For domain parameter whois is required");
                    amassArgs.push("-whois");
                }
            }

            // Add organization if provided
            if (intel_organization) {
                amassArgs.push("-org", "'"+intel_organization+"'");
            }
            if (intel_whois === true) {
                amassArgs.push("-whois");
            }

        }

        console.error(`Executing: amass ${amassArgs.join(' ')}`);

        const result = await secureSpawn(args[0], amassArgs);

        if (result.exitCode !== 0) {
            return {
                content: [{
                    type: "text" as const,
                    text: `Amass exited with code ${result.exitCode}. Output: ${result.stdout}${result.stderr}. Args:${amassArgs}`
                }]
            };
        }

        return {
            content: [{
                type: "text" as const,
                text: result.stdout
            }]
        };
    },
);

// Start the server
async function main() {
    await startServer(server);
}

main().catch((error) => {
    console.error("Fatal error in main():", error);
    process.exit(1);
});
