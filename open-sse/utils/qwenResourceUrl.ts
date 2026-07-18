/**
 * Qwen OAuth `resourceUrl` host allowlist (F-02-003).
 *
 * Token refresh can write upstream-controlled `resource_url` into
 * providerSpecificData.resourceUrl. That value must never become an open
 * SSRF / credential-exfil host while the Qwen Bearer is attached.
 */

/** Host suffixes allowed for Qwen chat completions. */
export const QWEN_RESOURCE_HOST_SUFFIXES = Object.freeze([
  "qwen.ai",
  "aliyuncs.com",
  "dashscope.aliyuncs.com",
]);

const DEFAULT_QWEN_HOST = "portal.qwen.ai";

function normalizeHost(hostname: string): string {
  const normalized = hostname.trim().toLowerCase();
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    return normalized.slice(1, -1);
  }
  // Strip trailing dot (DNS FQDN form).
  return normalized.endsWith(".") ? normalized.slice(0, -1) : normalized;
}

function isIpv4Literal(host: string): boolean {
  const parts = host.split(".");
  if (parts.length !== 4) return false;
  return parts.every((p) => {
    if (!/^\d{1,3}$/.test(p)) return false;
    const n = Number(p);
    return n >= 0 && n <= 255;
  });
}

function isIpv6Literal(host: string): boolean {
  return host.includes(":");
}

function hostMatchesAllowlist(host: string): boolean {
  for (const suffix of QWEN_RESOURCE_HOST_SUFFIXES) {
    if (host === suffix || host.endsWith(`.${suffix}`)) return true;
  }
  return false;
}

/**
 * True when `raw` is host[:port] (incl. bracketed IPv6) rather than a scheme URL.
 *
 * N9: the naive scheme check `/^[a-zA-Z][a-zA-Z0-9+.-]*:/` treats
 * `portal.qwen.ai:443` as scheme `portal.qwen.ai:` → false deny. Port must be
 * purely numeric; anything with `://` is never host-only.
 */
function isHostPortForm(raw: string): boolean {
  if (raw.includes("://")) return false;
  // [IPv6] or [IPv6]:port
  if (/^\[[0-9a-fA-F:.]+\](?::\d{1,5})?$/.test(raw)) return true;
  // hostname or hostname:numeric-port (no other colons — excludes schemes)
  if (/^[A-Za-z0-9._-]+(?::\d{1,5})?$/.test(raw)) return true;
  return false;
}

/**
 * Parse a resourceUrl value (host-only or full URL) into a validated hostname.
 * Returns null when the value is empty/absent (caller uses default).
 * Throws when the value is present but unsafe / not allowlisted.
 */
export function parseQwenResourceHost(resourceUrl: unknown): string | null {
  if (resourceUrl == null) return null;
  if (typeof resourceUrl !== "string") {
    throw new Error("Invalid Qwen resourceUrl: expected string host");
  }

  const raw = resourceUrl.trim();
  if (!raw) return null;

  // Reject userinfo smuggling and scheme-relative forms early.
  if (raw.includes("@") || raw.startsWith("//")) {
    throw new Error("Invalid Qwen resourceUrl: rejected authority form");
  }

  let hostname: string;
  try {
    // Absolute URL when a real scheme is present (not host:port — see N9).
    const looksLikeScheme =
      /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw) && !isHostPortForm(raw);
    if (looksLikeScheme) {
      const url = new URL(raw);
      if (url.protocol !== "https:") {
        throw new Error("Invalid Qwen resourceUrl: https required");
      }
      if (url.username || url.password) {
        throw new Error("Invalid Qwen resourceUrl: embedded credentials rejected");
      }
      hostname = url.hostname;
    } else {
      // Host-only form: hostname or hostname:port — no path/query/fragment.
      if (raw.includes("/") || raw.includes("?") || raw.includes("#") || raw.includes("\\")) {
        throw new Error("Invalid Qwen resourceUrl: path/query not allowed in host");
      }
      const url = new URL(`https://${raw}`);
      hostname = url.hostname;
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Invalid Qwen resourceUrl")) throw err;
    throw new Error("Invalid Qwen resourceUrl: unparseable host");
  }

  const host = normalizeHost(hostname);
  if (!host) {
    throw new Error("Invalid Qwen resourceUrl: empty host");
  }

  // Never allow IP literals (SSRF to metadata / LAN).
  if (isIpv4Literal(host) || isIpv6Literal(host)) {
    throw new Error("Invalid Qwen resourceUrl: IP literals rejected");
  }

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) {
    throw new Error("Invalid Qwen resourceUrl: local host rejected");
  }

  if (!hostMatchesAllowlist(host)) {
    throw new Error("Invalid Qwen resourceUrl: host not allowlisted");
  }

  return host;
}

/**
 * Build the Qwen chat completions URL from optional resourceUrl.
 * Falls back to portal.qwen.ai when resourceUrl is absent.
 * Throws on present-but-invalid values (fail closed).
 */
export function resolveQwenChatCompletionsUrl(resourceUrl: unknown): string {
  const host = parseQwenResourceHost(resourceUrl) ?? DEFAULT_QWEN_HOST;
  return `https://${host}/v1/chat/completions`;
}

/** Max 3xx hops when following Qwen redirects with per-hop host re-validation (N8). */
export const QWEN_MAX_REDIRECTS = 3;

/**
 * Resolve a redirect Location against the current request URL and re-apply the
 * Qwen host allowlist. Fail closed on non-https, credentials, or non-allowlisted hosts.
 *
 * N8: default `fetch` follows redirects without re-checking the hop host, which
 * would let a compromised allowlisted origin 30x to a private/metadata target
 * while the Qwen Bearer is still attached.
 */
export function resolveQwenRedirectLocation(currentUrl: string, location: string): string {
  let next: URL;
  try {
    next = new URL(location, currentUrl);
  } catch {
    throw new Error("Invalid Qwen resourceUrl: redirect Location unparseable");
  }
  if (next.protocol !== "https:") {
    throw new Error("Invalid Qwen resourceUrl: redirect must be https");
  }
  if (next.username || next.password) {
    throw new Error("Invalid Qwen resourceUrl: embedded credentials rejected");
  }
  // Re-validate hop host (path on allowlisted host is fine — only host is gated).
  parseQwenResourceHost(next.origin);
  return next.toString();
}

/**
 * Follow 3xx responses manually, re-validating each Location host.
 * `doFetch` must use `redirect: "manual"` so hops are not auto-followed.
 */
export async function fetchFollowingQwenRedirects(
  initialUrl: string,
  doFetch: (url: string) => Promise<Response>,
  maxHops: number = QWEN_MAX_REDIRECTS
): Promise<Response> {
  // Initial URL must also be allowlisted (buildUrl already enforces; defense-in-depth).
  parseQwenResourceHost(new URL(initialUrl).origin);

  let url = initialUrl;
  for (let hop = 0; hop <= maxHops; hop++) {
    const response = await doFetch(url);
    if (response.status < 300 || response.status >= 400) {
      return response;
    }
    const location = response.headers.get("location");
    if (!location) {
      // Consume body to avoid socket leaks on abandoned redirect responses.
      try {
        await response.body?.cancel();
      } catch {
        /* ignore */
      }
      throw new Error("Invalid Qwen resourceUrl: redirect missing Location");
    }
    try {
      await response.body?.cancel();
    } catch {
      /* ignore */
    }
    url = resolveQwenRedirectLocation(url, location);
  }
  throw new Error("Invalid Qwen resourceUrl: too many redirects");
}
