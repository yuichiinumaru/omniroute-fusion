/**
 * Path-segment and chat-path guards for URL construction.
 *
 * Shared by DefaultExecutor / BaseExecutor (chatPath) and intended for Task 0048
 * audio path builders (path segments that must not reshape URLs).
 */

/**
 * Validate a single URL path segment (no separators / traversal / query fragments).
 * Returns the segment on success; throws on invalid input.
 */
export function assertSafePathSegment(segment: string, label = "path segment"): string {
  if (typeof segment !== "string" || segment.length === 0) {
    throw new Error(`Invalid ${label}: empty`);
  }
  if (segment.length > 256) {
    throw new Error(`Invalid ${label}: too long`);
  }
  // Reject separators, traversal, query/fragment, null bytes, and encoded slash.
  if (
    segment.includes("/") ||
    segment.includes("\\") ||
    segment.includes("..") ||
    segment === "." ||
    segment.includes("?") ||
    segment.includes("#") ||
    segment.includes("\0") ||
    segment.includes("%2f") ||
    segment.includes("%2F") ||
    segment.includes("%5c") ||
    segment.includes("%5C")
  ) {
    throw new Error(`Invalid ${label}: contains forbidden characters`);
  }
  return segment;
}

/**
 * True when a custom chatPath is safe to append to a provider base URL.
 * Valid paths start with `/`, have no `..` / null bytes / query-fragment separators,
 * and stay within a sane length. Used by BaseExecutor + DefaultExecutor production paths.
 */
export function isSafeChatPath(path: string): boolean {
  if (typeof path !== "string") return false;
  if (!path.startsWith("/")) return false;
  if (path.includes("\0")) return false;
  if (path.includes("..")) return false;
  // Query/fragment separators would reshape the fetch target beyond a pure path.
  if (path.includes("?") || path.includes("#")) return false;
  if (path.length > 512) return false;
  return true;
}

/**
 * Resolve a custom chatPath: return the sanitized path, or null when invalid/absent
 * (callers fall back to the provider default path).
 */
export function resolveSafeChatPath(rawPath: unknown): string | null {
  if (typeof rawPath !== "string" || !rawPath) return null;
  return isSafeChatPath(rawPath) ? rawPath : null;
}
