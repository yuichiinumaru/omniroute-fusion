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
    // Prefer absolute URL parse when a scheme is present.
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(raw)) {
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
