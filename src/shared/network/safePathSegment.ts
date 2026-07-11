/**
 * Safe path-segment validation for interpolating client/operator values into
 * upstream URL paths (audio voice/model ids, executor chat paths, etc.).
 *
 * Rejects path separators, query/fragment markers, traversal sequences, percent-
 * encoding (which can smuggle separators), and any character outside a tight
 * allowlist. Shared by Task 0048 (audio handlers) and Task 0045 (executors).
 */

/** Characters allowed in a single path segment after validation. */
const SAFE_PATH_SEGMENT_RE = /^[A-Za-z0-9._~-]+$/;

/**
 * Returns true when `segment` is safe to interpolate as a single URL path segment.
 * Empty / whitespace-only values are rejected.
 */
export function isValidPathSegment(segment: unknown): boolean {
  if (typeof segment !== "string") return false;
  const value = segment.trim();
  if (value.length === 0) return false;

  // Explicit separators / traversal / encoding smuggling before the allowlist.
  if (
    value.includes("/") ||
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("%") ||
    value.includes("\0") ||
    value.includes("..") ||
    value.includes("//")
  ) {
    return false;
  }

  return SAFE_PATH_SEGMENT_RE.test(value);
}

/**
 * Assert a path segment is safe; returns the trimmed value or throws.
 */
export function assertSafePathSegment(segment: unknown, label = "path segment"): string {
  if (!isValidPathSegment(segment)) {
    throw new Error(`Invalid ${label}`);
  }
  return (segment as string).trim();
}
