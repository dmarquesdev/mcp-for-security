import assert from "node:assert/strict";

/** Extract text content from an MCP callTool result */
export function getContentText(result: Record<string, unknown>): string {
  const content = result["content"];
  if (!Array.isArray(content) || content.length === 0) {
    return "";
  }
  return content
    .filter((c: Record<string, unknown>) => c["type"] === "text")
    .map((c: Record<string, unknown>) => (c["text"] as string) || "")
    .join("\n");
}

export function assertContains(
  result: Record<string, unknown>,
  substring: string,
  message?: string,
): void {
  const text = getContentText(result);
  assert.ok(
    text.toLowerCase().includes(substring.toLowerCase()),
    message || `Expected output to contain "${substring}", got: ${text.slice(0, 500)}`,
  );
}

export function assertNotEmpty(
  result: Record<string, unknown>,
  message?: string,
): void {
  const text = getContentText(result);
  assert.ok(
    text.trim().length > 0,
    message || "Expected non-empty output",
  );
}

export function assertMatchesAny(
  result: Record<string, unknown>,
  patterns: string[],
  message?: string,
): void {
  const text = getContentText(result).toLowerCase();
  const matched = patterns.some((p) => text.includes(p.toLowerCase()));
  assert.ok(
    matched,
    message || `Expected output to contain at least one of: ${patterns.join(", ")}\nGot: ${text.slice(0, 500)}`,
  );
}

export function assertIsJson(
  result: Record<string, unknown>,
  message?: string,
): unknown {
  const text = getContentText(result);
  try {
    return JSON.parse(text);
  } catch {
    assert.fail(message || `Expected valid JSON, got: ${text.slice(0, 500)}`);
  }
}

/** Assert output has at least `min` non-empty lines (and optionally at most `max`) */
export function assertLineCount(
  result: Record<string, unknown>,
  min: number,
  max?: number,
  message?: string,
): void {
  const text = getContentText(result);
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  assert.ok(
    lines.length >= min,
    message || `Expected at least ${min} non-empty lines, got ${lines.length}:\n${text.slice(0, 500)}`,
  );
  if (max !== undefined) {
    assert.ok(
      lines.length <= max,
      message || `Expected at most ${max} non-empty lines, got ${lines.length}`,
    );
  }
}

/** Assert output matches a regex pattern */
export function assertMatchesRegex(
  result: Record<string, unknown>,
  pattern: RegExp,
  message?: string,
): void {
  const text = getContentText(result);
  assert.ok(
    pattern.test(text),
    message || `Expected output to match ${pattern}, got: ${text.slice(0, 500)}`,
  );
}

/** Parse JSON output and assert a field exists at a dot-separated path */
export function assertJsonField(
  result: Record<string, unknown>,
  fieldPath: string,
  expectedValue?: unknown,
): void {
  const text = getContentText(result);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    assert.fail(`Expected valid JSON for field check "${fieldPath}", got: ${text.slice(0, 300)}`);
  }
  const parts = fieldPath.replace(/\[(\d+)]/g, ".$1").split(".");
  let current: unknown = parsed;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      assert.fail(`Field path "${fieldPath}" not found — stopped at "${part}"`);
    }
    current = (current as Record<string, unknown>)[part];
  }
  assert.ok(
    current !== undefined,
    `Field "${fieldPath}" is undefined in JSON output`,
  );
  if (expectedValue !== undefined) {
    assert.deepStrictEqual(current, expectedValue, `Field "${fieldPath}" mismatch`);
  }
}

/** Assert MCP result has isError: true (for negative tests) */
export function assertIsError(
  result: Record<string, unknown>,
  message?: string,
): void {
  assert.ok(
    result["isError"] === true,
    message || `Expected isError: true, got: ${JSON.stringify(result).slice(0, 500)}`,
  );
}

/** Assert output contains a port number in typical scan format (e.g., "80/tcp" or ":80") */
export function assertContainsPort(
  result: Record<string, unknown>,
  port: number,
  message?: string,
): void {
  const text = getContentText(result);
  const patterns = [
    `${port}/tcp`,
    `${port}/udp`,
    `:${port}`,
    `port ${port}`,
    `${port}/open`,
  ];
  const found = patterns.some((p) => text.toLowerCase().includes(p.toLowerCase()));
  assert.ok(
    found,
    message || `Expected port ${port} in output, got: ${text.slice(0, 500)}`,
  );
}

/** Assert every non-empty line in the output looks like a URL */
export function assertLinesAreUrls(
  result: Record<string, unknown>,
  message?: string,
): void {
  const text = getContentText(result);
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  assert.ok(lines.length > 0, message || "Expected at least one line of output");
  const urlPattern = /^https?:\/\/\S+/;
  for (const line of lines) {
    assert.ok(
      urlPattern.test(line.trim()),
      message || `Line does not look like a URL: "${line.trim()}"`,
    );
  }
}
