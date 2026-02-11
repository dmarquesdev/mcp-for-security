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
