/**
 * Extract a human-readable message from an API error response body.
 *
 * OmniRoute's structured error envelope is `{ error: { code, message,
 * correlation_id } }`, but some routes return `{ error: "string" }` or top-level
 * `{ message }` / `{ detail }`. Rendering the raw `error` object in the
 * dashboard yields "[object Object]" (or nothing), which hid actionable
 * messages such as `INVALID_ORIGIN` (#5340) — the operator saw a silent failure
 * instead of guidance. Funnel API error bodies through this so the message
 * (and its actionable hint) always surfaces.
 *
 * Coverage aligned with {@link getErrorMessage} in `@/shared/utils/api` for
 * nested envelopes + top-level message/detail (Task 0047 path-to-100 N5).
 */
export function extractApiErrorMessage(body: unknown, fallback: string): string {
  const safeFallback =
    typeof fallback === "string" && fallback.trim() ? fallback : "Request failed";

  if (typeof body === "string" && body.trim()) {
    return body.length > 300 ? `${body.slice(0, 300)}…` : body.trim();
  }

  if (body && typeof body === "object") {
    const rec = body as Record<string, unknown>;
    const err = rec.error;
    if (typeof err === "string" && err.trim()) return err.trim();
    if (err && typeof err === "object") {
      const nested = (err as { message?: unknown }).message;
      if (typeof nested === "string" && nested.trim()) return nested.trim();
      // Never stringify into operator UI as [object Object] — fall through.
    }
    const top = rec.message ?? rec.detail;
    if (typeof top === "string" && top.trim()) return top.trim();
  }

  return safeFallback;
}
