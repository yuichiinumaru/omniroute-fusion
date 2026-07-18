/**
 * Safe path validation for interpolating client/operator values into
 * upstream URL paths (audio voice/model ids, HF `org/model`, executor segments).
 *
 * Accepts:
 * - single segments: `voice-9`, `whisper-1`, `inworld_tts_2`
 * - multi-segment relative paths: `openai/whisper-large-v3`, `facebook/mms-tts-eng`
 *   (each segment must match the allowlist independently)
 *
 * Rejects path injection / traversal:
 * - empty segments, leading/trailing `/`, `//`
 * - `.` / `..` traversal
 * - `\`, query/fragment separators, null bytes
 * - percent-encoding (can smuggle separators / traversal)
 *
 * Shared SSoT for Task 0048 (audio handlers) and Task 0045 (open-sse re-export).
 */

/** Characters allowed in a single path segment after validation. */
const SAFE_PATH_SEGMENT_RE = /^[A-Za-z0-9._~-]+$/;

/** Max segments in a multi-segment relative path (HF is typically `org/model`). */
const MAX_SEGMENTS = 8;

/** Max total length of the relative path value. */
const MAX_TOTAL_LENGTH = 256;

/**
 * Returns true when `value` is safe to interpolate into a URL path after a `/`.
 * Empty / whitespace-only values are rejected.
 *
 * Multi-segment values (`org/model`) are allowed when every segment is safe.
 * Callers that need a single segment only should additionally check `!value.includes("/")`.
 *
 * Type predicate: on `true`, `segment` is a string (caller may still want `.trim()`;
 * `assertSafePathSegment` returns the trimmed form).
 */
export function isValidPathSegment(segment: unknown): segment is string {
  if (typeof segment !== "string") return false;
  const value = segment.trim();
  if (value.length === 0 || value.length > MAX_TOTAL_LENGTH) return false;

  // Global forbidden forms before splitting — these reshape the fetch target.
  if (
    value.includes("\\") ||
    value.includes("?") ||
    value.includes("#") ||
    value.includes("%") ||
    value.includes("\0") ||
    value.startsWith("/") ||
    value.endsWith("/") ||
    value.includes("//")
  ) {
    return false;
  }

  const parts = value.split("/");
  if (parts.length === 0 || parts.length > MAX_SEGMENTS) return false;

  for (const part of parts) {
    if (part.length === 0) return false;
    // Explicit traversal / current-dir segments.
    if (part === "." || part === "..") return false;
    // `foo..bar` can smuggle traversal intent past naive checks; reject any `..`.
    if (part.includes("..")) return false;
    if (!SAFE_PATH_SEGMENT_RE.test(part)) return false;
  }

  return true;
}

/**
 * Single-segment only (no `/`). Use for ElevenLabs voice ids and similar slots
 * that must never extend the path with extra segments.
 * HF model ids must use {@link isValidPathSegment} (multi-segment-safe).
 */
export function isValidSinglePathSegment(segment: unknown): segment is string {
  if (!isValidPathSegment(segment)) return false;
  return !segment.includes("/");
}

/**
 * Assert a path (single- or multi-segment) is safe; returns the trimmed value or throws.
 * No `as` cast — refinement via `isValidPathSegment` type predicate.
 */
export function assertSafePathSegment(segment: unknown, label = "path segment"): string {
  if (!isValidPathSegment(segment)) {
    throw new Error(`Invalid ${label}`);
  }
  return segment.trim();
}
