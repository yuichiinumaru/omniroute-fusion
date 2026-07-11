/**
 * MCP tool error sanitization (Hard Rule #12 / F-04-W2-004).
 *
 * Central helpers so tool catch blocks and the scope wrapper never return
 * raw `err.message`, stack tails, or absolute paths to MCP clients.
 */

import { sanitizeErrorMessage } from "../utils/error.ts";

export type McpTextToolResult = {
  content: Array<{ type: "text"; text: string; [key: string]: unknown }>;
  isError?: boolean;
  [key: string]: unknown;
};

/**
 * Sanitize an unknown thrown/returned error for MCP clients.
 * Logs stay raw at the call site; only the client-facing string is sanitized.
 */
export function sanitizeMcpErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return sanitizeErrorMessage(error.message) || "Unexpected error";
  }
  return sanitizeErrorMessage(error) || "Unexpected error";
}

/** Build a standard MCP tool error result with a sanitized message. */
export function mcpToolErrorResult(error: unknown): McpTextToolResult {
  const msg = sanitizeMcpErrorMessage(error);
  return {
    content: [{ type: "text" as const, text: `Error: ${msg}` }],
    isError: true,
  };
}

/**
 * Sanitize any isError tool result already shaped as `{ content, isError }`.
 * Mutates text blocks in place and returns the same object for chaining.
 */
export function sanitizeMcpToolResult<T extends McpTextToolResult>(result: T): T {
  if (!result?.isError || !Array.isArray(result.content)) return result;
  for (const block of result.content) {
    if (!block || block.type !== "text" || typeof block.text !== "string") continue;
    const raw = block.text.startsWith("Error: ") ? block.text.slice("Error: ".length) : block.text;
    const safe = sanitizeErrorMessage(raw) || "Unexpected error";
    block.text = block.text.startsWith("Error: ") ? `Error: ${safe}` : safe;
  }
  return result;
}
