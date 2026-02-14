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

describe("naabu-mcp", () => {
    const mock = createMockSpawn();
    const harness = createTestServer("naabu");

    harness.server.tool(
        "do-naabu",
        "Fast port scanner for network reconnaissance",
        {
            host: z.string(),
            ports: z.string().optional(),
            top_ports: z.number().optional(),
            exclude_ports: z.string().optional(),
            scan_type: z.enum(["s", "c"]).optional(),
            rate: z.number().optional(),
            retries: z.number().optional(),
            probe_timeout: z.number().optional(),
            warm_up_time: z.number().optional(),
            json: z.boolean().optional(),
            silent: z.boolean().optional(),
            interface_name: z.string().optional(),
            source_ip: z.string().optional(),
            exclude_cdn: z.boolean().optional(),
            display_cdn: z.boolean().optional(),
            service_discovery: z.boolean().optional(),
            service_version: z.boolean().optional(),
            ping: z.boolean().optional(),
            ...TIMEOUT_SCHEMA,
        },
        async ({ host, ports, top_ports, exclude_ports, scan_type, rate, retries, probe_timeout, warm_up_time, json, silent, interface_name, source_ip, exclude_cdn, display_cdn, service_discovery, service_version, ping, timeoutSeconds }, extra) => {
            const naabuArgs: string[] = ["-host", host, "-no-stdin"];

            if (ports) naabuArgs.push("-p", ports);
            if (top_ports !== undefined) naabuArgs.push("-top-ports", top_ports.toString());
            if (exclude_ports) naabuArgs.push("-exclude-ports", exclude_ports);
            if (scan_type) naabuArgs.push("-s", scan_type);
            if (rate !== undefined) naabuArgs.push("-rate", rate.toString());
            if (retries !== undefined) naabuArgs.push("-retries", retries.toString());
            if (probe_timeout !== undefined) naabuArgs.push("-timeout", probe_timeout.toString());
            if (warm_up_time !== undefined) naabuArgs.push("-warm-up-time", warm_up_time.toString());
            if (json) naabuArgs.push("-json");
            if (silent) naabuArgs.push("-silent");
            if (interface_name) naabuArgs.push("-interface", interface_name);
            if (source_ip) naabuArgs.push("-source-ip", source_ip);
            if (exclude_cdn) naabuArgs.push("-exclude-cdn");
            if (display_cdn) naabuArgs.push("-display-cdn");
            if (service_discovery) naabuArgs.push("-sD");
            if (service_version) naabuArgs.push("-sV");
            if (ping) naabuArgs.push("-ping");

            const result = await mock.spawn("naabu", naabuArgs, buildSpawnOptions(extra, { timeoutSeconds }));
            return formatToolResult(result, { toolName: "naabu" });
        }
    );

    afterEach(() => mock.reset());

    it("registers the do-naabu tool", async () => {
        await harness.connect();
        await assertToolExists(harness.client, "do-naabu");
        await harness.cleanup();
    });

    it("passes host with -host flag and -no-stdin", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "192.168.1.1",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-host", "192.168.1.1", "-no-stdin"]);
        await harness.cleanup();
    });

    it("ports appends -p with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            ports: "80,443,8080",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-host", "10.0.0.1", "-no-stdin", "-p", "80,443,8080"]);
        await harness.cleanup();
    });

    it("top_ports appends -top-ports with value as string", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            top_ports: 100,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-host", "10.0.0.1", "-no-stdin", "-top-ports", "100"]);
        await harness.cleanup();
    });

    it("exclude_ports appends -exclude-ports with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            exclude_ports: "22,3389",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-host", "10.0.0.1", "-no-stdin", "-exclude-ports", "22,3389"]);
        await harness.cleanup();
    });

    it("scan_type appends -s with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            scan_type: "c",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-host", "10.0.0.1", "-no-stdin", "-s", "c"]);
        await harness.cleanup();
    });

    it("rate appends -rate with value as string", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            rate: 1000,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-host", "10.0.0.1", "-no-stdin", "-rate", "1000"]);
        await harness.cleanup();
    });

    it("retries appends -retries with value as string", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            retries: 5,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-host", "10.0.0.1", "-no-stdin", "-retries", "5"]);
        await harness.cleanup();
    });

    it("probe_timeout maps to -timeout with value as string", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            probe_timeout: 2000,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-host", "10.0.0.1", "-no-stdin", "-timeout", "2000"]);
        await harness.cleanup();
    });

    it("warm_up_time appends -warm-up-time with value as string", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            warm_up_time: 5,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-host", "10.0.0.1", "-no-stdin", "-warm-up-time", "5"]);
        await harness.cleanup();
    });

    it("json appends -json flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            json: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-json"));
        await harness.cleanup();
    });

    it("silent appends -silent flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            silent: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-silent"));
        await harness.cleanup();
    });

    it("interface_name appends -interface with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            interface_name: "eth0",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-host", "10.0.0.1", "-no-stdin", "-interface", "eth0"]);
        await harness.cleanup();
    });

    it("source_ip appends -source-ip with value", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            source_ip: "192.168.1.100",
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, ["-host", "10.0.0.1", "-no-stdin", "-source-ip", "192.168.1.100"]);
        await harness.cleanup();
    });

    it("exclude_cdn appends -exclude-cdn flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            exclude_cdn: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-exclude-cdn"));
        await harness.cleanup();
    });

    it("display_cdn appends -display-cdn flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            display_cdn: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-display-cdn"));
        await harness.cleanup();
    });

    it("service_discovery appends -sD flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            service_discovery: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-sD"));
        await harness.cleanup();
    });

    it("service_version appends -sV flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            service_version: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-sV"));
        await harness.cleanup();
    });

    it("ping appends -ping flag", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            ping: true,
        });
        assert.ok(mock.lastCall()?.args.includes("-ping"));
        await harness.cleanup();
    });

    it("all flags combined build correct args", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "192.168.1.0/24",
            ports: "80,443",
            top_ports: 100,
            exclude_ports: "22",
            scan_type: "s",
            rate: 500,
            retries: 2,
            probe_timeout: 1500,
            warm_up_time: 3,
            json: true,
            silent: true,
            interface_name: "eth0",
            source_ip: "10.0.0.5",
            exclude_cdn: true,
            display_cdn: true,
            service_discovery: true,
            service_version: true,
            ping: true,
        });
        const last = mock.lastCall();
        assert.deepStrictEqual(last?.args, [
            "-host", "192.168.1.0/24", "-no-stdin",
            "-p", "80,443",
            "-top-ports", "100",
            "-exclude-ports", "22",
            "-s", "s",
            "-rate", "500",
            "-retries", "2",
            "-timeout", "1500",
            "-warm-up-time", "3",
            "-json",
            "-silent",
            "-interface", "eth0",
            "-source-ip", "10.0.0.5",
            "-exclude-cdn",
            "-display-cdn",
            "-sD",
            "-sV",
            "-ping",
        ]);
        await harness.cleanup();
    });

    it("rejects when host is missing", async () => {
        await harness.connect();
        await assertToolCallFails(harness.client, "do-naabu", {});
        await harness.cleanup();
    });

    it("returns mock output as text content", async () => {
        const customMock = createMockSpawn({
            defaultResult: {
                stdout: "192.168.1.1:80\n192.168.1.1:443\n192.168.1.1:8080",
                stderr: "",
                exitCode: 0,
            },
        });
        const h = createTestServer("naabu-output");
        h.server.tool(
            "do-naabu",
            "port scan",
            { host: z.string() },
            async ({ host }) => {
                const result = await customMock.spawn("naabu", ["-host", host, "-no-stdin"], {});
                return formatToolResult(result, { toolName: "naabu" });
            }
        );
        await h.connect();
        const result = await assertToolCallSucceeds(h.client, "do-naabu", {
            host: "192.168.1.1",
        });
        const text = getResultText(result);
        assert.ok(text.includes("192.168.1.1:80"));
        assert.ok(text.includes("192.168.1.1:443"));
        assert.ok(text.includes("192.168.1.1:8080"));
        await h.cleanup();
    });

    it("passes timeoutSeconds to spawn options", async () => {
        await harness.connect();
        await assertToolCallSucceeds(harness.client, "do-naabu", {
            host: "10.0.0.1",
            timeoutSeconds: 120,
        });
        const opts = mock.lastCall()?.options;
        assert.equal(opts?.timeoutMs, 120000);
        await harness.cleanup();
    });
});
