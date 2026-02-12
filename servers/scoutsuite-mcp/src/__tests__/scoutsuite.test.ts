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
import { formatToolResult, TIMEOUT_SCHEMA, buildSpawnOptions } from "mcp-shared";

describe("scoutsuite-mcp", () => {
    const mock = createMockSpawn({
        defaultResult: {
            stdout: "ScoutSuite scan complete\nReport: scoutsuite-report/scoutsuite_results_aws.js",
            stderr: "",
            exitCode: 0,
        },
    });
    const harness = createTestServer("scoutsuite");

    // Register the tool with mock spawn (simplified: returns formatted output
    // instead of parsing the report file, which requires filesystem access)
    harness.server.tool(
        "do-scoutsuite-aws",
        "Performs an AWS cloud security audit using Scout Suite",
        {
            full_report: z.boolean().default(false).optional().describe("Return full findings details"),
            max_workers: z.number().optional().describe("Maximum parallel worker threads"),
            services: z.array(z.string()).optional().describe("AWS services to include"),
            skip_services: z.array(z.string()).optional().describe("AWS services to exclude"),
            profile: z.string().optional().describe("Named AWS CLI profile"),
            regions: z.string().optional().describe("Comma-separated AWS regions"),
            exclude_regions: z.string().optional().describe("Comma-separated AWS regions to exclude"),
            ...TIMEOUT_SCHEMA,
        },
        async ({ full_report, max_workers, services, skip_services, profile, regions, exclude_regions, timeoutSeconds }, extra) => {
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
            if (regions) scoutSuiteArgs.push("--regions", regions);
            if (exclude_regions) scoutSuiteArgs.push("--exclude-regions", exclude_regions);

            const result = await mock.spawn("scout", scoutSuiteArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "scoutsuite", includeStderr: true, stripAnsi: true });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-scoutsuite-aws tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-scoutsuite-aws");
        await harness.cleanup();
    });

    it("passes base args (aws --force --no-browser) with no optional flags", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-scoutsuite-aws", {});
        assert.equal(mock.calls.length, 1);
        assert.equal(mock.calls[0].binary, "scout");
        assert.deepEqual(mock.calls[0].args, ["aws", "--force", "--no-browser"]);
        await harness.cleanup();
    });

    it("passes max_workers flag correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-scoutsuite-aws", {
            max_workers: 20,
        });
        assert.equal(mock.calls.length, 1);
        const args = mock.calls[0].args;
        const idx = args.indexOf("--max-workers");
        assert.ok(idx >= 0, "should include --max-workers flag");
        assert.equal(args[idx + 1], "20");
        await harness.cleanup();
    });

    it("passes services flag correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-scoutsuite-aws", {
            services: ["s3", "iam", "ec2"],
        });
        assert.equal(mock.calls.length, 1);
        const args = mock.calls[0].args;
        const idx = args.indexOf("--services");
        assert.ok(idx >= 0, "should include --services flag");
        assert.equal(args[idx + 1], "s3");
        assert.equal(args[idx + 2], "iam");
        assert.equal(args[idx + 3], "ec2");
        await harness.cleanup();
    });

    it("passes skip_services flag correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-scoutsuite-aws", {
            skip_services: ["cloudtrail", "lambda"],
        });
        assert.equal(mock.calls.length, 1);
        const args = mock.calls[0].args;
        const idx = args.indexOf("--skip");
        assert.ok(idx >= 0, "should include --skip flag");
        assert.equal(args[idx + 1], "cloudtrail");
        assert.equal(args[idx + 2], "lambda");
        await harness.cleanup();
    });

    it("passes profile flag correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-scoutsuite-aws", {
            profile: "production",
        });
        assert.equal(mock.calls.length, 1);
        const args = mock.calls[0].args;
        const idx = args.indexOf("--profile");
        assert.ok(idx >= 0, "should include --profile flag");
        assert.equal(args[idx + 1], "production");
        await harness.cleanup();
    });

    it("passes regions flag correctly", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-scoutsuite-aws", {
            regions: "us-east-1,us-west-2",
        });
        assert.equal(mock.calls.length, 1);
        const args = mock.calls[0].args;
        const idx = args.indexOf("--regions");
        assert.ok(idx >= 0, "should include --regions flag");
        assert.equal(args[idx + 1], "us-east-1,us-west-2");
        await harness.cleanup();
    });

    it("passes multiple flags together", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-scoutsuite-aws", {
            max_workers: 10,
            services: ["s3", "iam"],
            profile: "dev",
            regions: "eu-west-1",
        });
        assert.equal(mock.calls.length, 1);
        const args = mock.calls[0].args;
        assert.ok(args.includes("--max-workers"), "should include --max-workers");
        assert.ok(args.includes("--services"), "should include --services");
        assert.ok(args.includes("--profile"), "should include --profile");
        assert.ok(args.includes("--regions"), "should include --regions");
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        await harness.connect();
        const result = await assertToolCallSucceeds(harness.client, "do-scoutsuite-aws", {});
        const text = getResultText(result);
        assert.ok(text.includes("ScoutSuite scan complete"));
        await harness.cleanup();
    });

    it("handles nonzero exit code as error", async () => {
        const errorMock = createMockSpawn({
            defaultResult: { stdout: "", stderr: "Authentication failed", exitCode: 1 },
        });
        const h = createTestServer("scoutsuite-error");
        h.server.tool(
            "do-scoutsuite-aws",
            "Audit AWS",
            {
                full_report: z.boolean().default(false).optional(),
                max_workers: z.number().optional(),
                services: z.array(z.string()).optional(),
                skip_services: z.array(z.string()).optional(),
                profile: z.string().optional(),
                regions: z.string().optional(),
                exclude_regions: z.string().optional(),
            },
            async () => {
                const result = await errorMock.spawn("scout", ["aws"]);
                return formatToolResult(result, { toolName: "scoutsuite", includeStderr: true, stripAnsi: true });
            }
        );
        await h.connect();
        await assertToolCallFails(h.client, "do-scoutsuite-aws", {});
        await h.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-scoutsuite-aws", {
            timeoutSeconds: 60,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 60000);
        await harness.cleanup();
    });
});
