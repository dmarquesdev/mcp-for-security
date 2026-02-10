import { spawn } from "child_process";

const DEFAULT_MAX_OUTPUT_BYTES = 50 * 1024 * 1024; // 50MB
const DEFAULT_TIMEOUT_MS = 300_000; // 5 minutes

export interface SpawnOptions {
    maxOutputBytes?: number;
    timeoutMs?: number;
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    signal?: AbortSignal;
}

export interface SpawnResult {
    stdout: string;
    stderr: string;
    exitCode: number;
}

export function secureSpawn(
    binary: string,
    args: string[],
    options?: SpawnOptions
): Promise<SpawnResult> {
    const maxOutputBytes = options?.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    const timeoutMs = options?.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    return new Promise((resolve, reject) => {
        if (options?.signal?.aborted) {
            reject(new Error("Aborted"));
            return;
        }

        const proc = spawn(binary, args, {
            stdio: ["ignore", "pipe", "pipe"],
            cwd: options?.cwd ?? process.cwd(),
            env: options?.env ?? process.env,
        });

        let stdout = "";
        let stderr = "";
        let stdoutBytes = 0;
        let stderrBytes = 0;
        let killed = false;

        const timer = setTimeout(() => {
            killed = true;
            proc.kill("SIGKILL");
            reject(new Error(`Process timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        const onAbort = () => {
            if (!killed) {
                killed = true;
                proc.kill("SIGKILL");
                clearTimeout(timer);
                reject(new Error("Aborted"));
            }
        };

        if (options?.signal) {
            options.signal.addEventListener("abort", onAbort, { once: true });
        }

        const cleanup = () => {
            if (options?.signal) {
                options.signal.removeEventListener("abort", onAbort);
            }
        };

        proc.stdout.on("data", (data: Buffer) => {
            stdoutBytes += data.length;
            if (stdoutBytes + stderrBytes > maxOutputBytes) {
                if (!killed) {
                    killed = true;
                    proc.kill("SIGKILL");
                    clearTimeout(timer);
                    cleanup();
                    reject(
                        new Error(
                            `Output exceeded ${maxOutputBytes} bytes limit`
                        )
                    );
                }
                return;
            }
            stdout += data.toString();
        });

        proc.stderr.on("data", (data: Buffer) => {
            stderrBytes += data.length;
            if (stdoutBytes + stderrBytes > maxOutputBytes) {
                if (!killed) {
                    killed = true;
                    proc.kill("SIGKILL");
                    clearTimeout(timer);
                    cleanup();
                    reject(
                        new Error(
                            `Output exceeded ${maxOutputBytes} bytes limit`
                        )
                    );
                }
                return;
            }
            stderr += data.toString();
        });

        proc.on("close", (code) => {
            if (killed) return;
            clearTimeout(timer);
            cleanup();
            resolve({
                stdout,
                stderr,
                exitCode: code ?? 1,
            });
        });

        proc.on("error", (error) => {
            if (killed) return;
            clearTimeout(timer);
            cleanup();
            reject(new Error(`Failed to start process: ${error.message}`));
        });
    });
}
