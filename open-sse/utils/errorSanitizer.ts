/**
 * Sanitize an error message to prevent stack trace exposure in API responses.
 * Strips stack traces, file paths, and absolute Windows/POSIX paths from
 * error messages before they reach the client.
 *
 * This module is pure and client-safe (0 server/DB/Node-builtin imports).
 */

// Length cap protects against pathological inputs even before tokenization.
const MAX_ERROR_LEN = 4096;
const SOURCE_EXT = ["ts", "tsx", "js", "jsx", "mjs", "cjs"] as const;

function looksLikeAbsolutePath(tok: string): boolean {
  // POSIX: "/<...>.ts" (optionally followed by :line[:col]).
  // Windows: "C:\<...>.ts" or "C:/<...>.ts".
  if (tok.length < 4 || tok.length > 2048) return false;
  const isPosix = tok.charCodeAt(0) === 0x2f; // '/'
  const isWindows = tok.length > 2 && tok.charCodeAt(1) === 0x3a && /[A-Za-z]/.test(tok[0]);
  if (!isPosix && !isWindows) return false;
  const dot = tok.lastIndexOf(".");
  if (dot <= 0 || dot === tok.length - 1) return false;
  const ext = tok
    .slice(dot + 1)
    .split(":", 1)[0]
    .toLowerCase();
  return (SOURCE_EXT as readonly string[]).includes(ext);
}

/** Absolute path token without requiring a source extension (stack-frame tails). */
function looksLikeAbsolutePathLoose(tok: string): boolean {
  if (tok.length < 2 || tok.length > 2048) return false;
  if (tok.charCodeAt(0) === 0x2f) return true; // POSIX
  return tok.length > 2 && tok.charCodeAt(1) === 0x3a && /[A-Za-z]/.test(tok[0]);
}

/**
 * Strip stack-trace tail and absolute source paths from error messages.
 *
 * Implemented via simple whitespace tokenization (linear time) instead of a
 * single complex regex, so CodeQL `js/polynomial-redos` stays clean even when
 * the runtime error message is attacker-controlled.
 */
export function sanitizeErrorMessage(message: unknown): string {
  let str = typeof message === "string" ? message : String(message ?? "");
  if (str.length > MAX_ERROR_LEN) str = str.slice(0, MAX_ERROR_LEN);
  const nl = str.indexOf("\n");
  const firstLine = nl >= 0 ? str.slice(0, nl) : str;

  // Pure stack-frame first lines (e.g. "at /tmp/x" or "at foo (/app/x.ts:1:1)")
  // must not reach clients — collapse to a stable generic message.
  // Deliberately does NOT match product copy like "at least one model required".
  if (/^\s*at\s+(?:.*\()?(\/|[A-Za-z]:[\\/])/.test(firstLine)) {
    return "Internal error";
  }

  // Preserve original whitespace by splitting on captured separator.
  const parts = firstLine.split(/(\s+)/);
  for (let i = 0; i < parts.length; i++) {
    if (looksLikeAbsolutePath(parts[i])) {
      parts[i] = "<path>";
      continue;
    }
    // Redact absolute path tokens that follow a bare "at" (stack-frame fragment).
    // Example: "boom at /tmp/x" → "boom at <path>"
    if (
      i >= 2 &&
      parts[i - 2] === "at" &&
      /^\s+$/.test(parts[i - 1] || "") &&
      looksLikeAbsolutePathLoose(parts[i])
    ) {
      parts[i] = "<path>";
    }
  }
  return parts.join("");
}
