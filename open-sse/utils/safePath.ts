/**
 * Chat-path guards for URL construction (BaseExecutor / DefaultExecutor).
 *
 * Path-segment validation is SSoT in `@/shared/network/safePathSegment`
 * (shared with audio handlers — Task 0048). This module re-exports that SSoT
 * and owns chatPath-specific rules for custom provider chat paths.
 */

export {
  isValidPathSegment,
  isValidSinglePathSegment,
  assertSafePathSegment,
} from "@/shared/network/safePathSegment";

import { isValidPathSegment } from "@/shared/network/safePathSegment";

/**
 * True when a custom chatPath is safe to append to a provider base URL.
 *
 * Rules:
 * - Must start with a single `/` (absolute path on the same origin)
 * - Must NOT be protocol-relative (`//evil.com` — `new URL(path, base)` would switch host)
 * - No empty segments (`//`), backslash, query/fragment, null bytes, or percent-encoding
 * - Each path segment must pass the shared allowlist (no `..` traversal)
 * - Length capped at 512
 *
 * Used by BaseExecutor + DefaultExecutor production paths (F-02-001 / N6).
 */
export function isSafeChatPath(path: string): boolean {
  if (typeof path !== "string") return false;
  if (!path.startsWith("/")) return false;
  // Protocol-relative / authority-like forms must never be treated as a path.
  if (path.startsWith("//")) return false;
  if (path.includes("\0")) return false;
  // Query/fragment separators would reshape the fetch target beyond a pure path.
  if (path.includes("?") || path.includes("#")) return false;
  // Backslash can be normalized to `/` by some URL stacks.
  if (path.includes("\\")) return false;
  // Percent-encoding smuggles `..` / `/` / `\` past denylist checks (`%2e%2e`, `%2f`).
  if (path.includes("%")) return false;
  // Whitespace / controls: `isValidPathSegment` trims before the allowlist, but
  // callers return the raw path — reject so `/v1/chat\t` cannot slip past.
  if (/[\s\r\n\t\v\f\u0000-\u001f\u007f]/.test(path)) return false;
  if (path.length > 512) return false;
  // Empty path segment (`/v1//chat`) — authority-adjacent and ambiguous.
  if (path.includes("//")) return false;

  // Drop leading `/` and validate the remainder via shared multi-segment allowlist.
  const rest = path.slice(1);
  if (rest.length === 0) return false; // bare `/` is not a usable chat path
  return isValidPathSegment(rest);
}

/**
 * Resolve a custom chatPath: return the sanitized path, or null when invalid/absent
 * (callers fall back to the provider default path).
 */
export function resolveSafeChatPath(rawPath: unknown): string | null {
  if (typeof rawPath !== "string" || !rawPath) return null;
  return isSafeChatPath(rawPath) ? rawPath : null;
}
