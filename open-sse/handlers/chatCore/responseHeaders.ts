import {
  attachOmniRouteMetaHeaders,
  buildOmniRouteResponseMetaHeaders,
} from "@/domain/omnirouteResponseMeta";
import { OMNIROUTE_RESPONSE_HEADERS } from "@/shared/constants/headers";

/**
 * Headers that must never be forwarded from upstream into the client SSE response.
 *
 * Policy: denylist (not allowlist) so rate-limit / provider meta headers still
 * flow through. Covers hop-by-hop (RFC 7230 §6.1), framing already managed by
 * this proxy, and sensitive auth/session headers that must not leak across the
 * proxy boundary (F-01-004).
 */
const STREAMING_RESPONSE_HEADER_DENYLIST = new Set(
  [
    // Framing / body encoding (we re-emit SSE with our own Content-Type)
    "content-type",
    "content-encoding",
    "content-length",
    "transfer-encoding",
    // Hop-by-hop
    "connection",
    "keep-alive",
    "proxy-connection",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "upgrade",
    // Auth / session leak surface
    "set-cookie",
    "set-cookie2",
    "authorization",
    "www-authenticate",
    "cookie",
    "x-api-key",
    "x-goog-api-key",
    "api-key",
  ].map((s) => s.toLowerCase())
);

export function buildStreamingResponseHeaders(
  providerHeaders: Headers,
  meta: Parameters<typeof buildOmniRouteResponseMetaHeaders>[0]
): Record<string, string> {
  const forwardedHeaders: [string, string][] = [];
  providerHeaders.forEach((value, key) => {
    if (!STREAMING_RESPONSE_HEADER_DENYLIST.has(key.toLowerCase())) {
      forwardedHeaders.push([key, value]);
    }
  });

  const responseHeaders: Record<string, string> = {
    ...Object.fromEntries(forwardedHeaders),
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
    [OMNIROUTE_RESPONSE_HEADERS.cache]: "MISS",
  };
  attachOmniRouteMetaHeaders(responseHeaders, meta);
  return responseHeaders;
}

export function materializeDeduplicatedExecutionResult<T extends Record<string, unknown>>(
  result: T
): T {
  const snapshot =
    result && typeof result === "object"
      ? ((result as Record<string, unknown>)._dedupSnapshot as
          | {
              status: number;
              statusText: string;
              headers: [string, string][];
              payload: string;
            }
          | undefined)
      : undefined;

  if (!snapshot) return result;

  return {
    ...result,
    response: new Response(snapshot.payload, {
      status: snapshot.status,
      statusText: snapshot.statusText,
      headers: snapshot.headers,
    }),
  } as T;
}

/**
 * Strip hop-by-hop headers that describe the upstream wire encoding.
 *
 * `readNonStreamingResponseBody` reads (and, for compressed responses, also
 * decompresses via fetch's auto-decoder) the full upstream body into a JS
 * string before we re-emit it to the client. Once that happens, the original
 * `Content-Encoding`, `Content-Length`, and `Transfer-Encoding` all describe
 * a payload that no longer exists:
 *
 *   - `Content-Length` is the *compressed* byte count, so clients honoring it
 *     read only the first N bytes of the decompressed JSON and surface
 *     "Unterminated string in JSON at position …" parse failures (observed
 *     on gzipped Gemini responses).
 *   - `Content-Encoding` advertises a compression we have already undone.
 *   - `Transfer-Encoding` is hop-by-hop per RFC 7230 §6.1 and must not be
 *     forwarded across a buffering proxy — its presence alongside a
 *     re-emitted body is undefined behavior.
 *
 * Deleting all three lets the response framework set a fresh, correct
 * `Content-Length` (or fall back to `Transfer-Encoding: chunked`) for the
 * payload we are actually sending.
 */
export function stripStaleForwardingHeaders(headers: Headers): void {
  headers.delete("content-encoding");
  headers.delete("content-length");
  headers.delete("transfer-encoding");
}
