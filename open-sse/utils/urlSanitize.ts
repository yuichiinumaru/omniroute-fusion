/**
 * Strip trailing slash characters from a string without using a regex
 * quantifier on uncontrolled input (avoids CodeQL `js/polynomial-redos`).
 *
 * Equivalent to `value.replace(/\/+$/, "")` but runs in O(n) guaranteed
 * time with no backtracking risk.
 */
export function stripTrailingSlashes(value: string): string {
  let end = value.length;
  while (end > 0 && value.charCodeAt(end - 1) === 0x2f /* '/' */) {
    end--;
  }
  return end === value.length ? value : value.slice(0, end);
}

/** Query parameter names that commonly carry long-lived API secrets. */
const SECRET_QUERY_KEYS = new Set([
  "key",
  "api_key",
  "apikey",
  "access_token",
  "access-token",
  "token",
  "secret",
  "client_secret",
  "password",
  "auth",
]);

/**
 * Redact secret material from a URL for logging (query keys, userinfo).
 * Returns the original string when parsing fails (still best-effort regex strip).
 *
 * Use for Vertex Express `?key=`, OAuth tokens in query, etc. Keep the real URL
 * only for the outbound `fetch` call — never log it unredacted.
 */
export function redactUrlSecrets(url: string): string {
  if (typeof url !== "string" || !url) return url;

  try {
    const parsed = new URL(url);
    let changed = false;

    if (parsed.password) {
      parsed.password = "***";
      changed = true;
    }
    if (parsed.username && SECRET_QUERY_KEYS.has(parsed.username.toLowerCase())) {
      parsed.username = "***";
      changed = true;
    }

    for (const key of [...parsed.searchParams.keys()]) {
      if (SECRET_QUERY_KEYS.has(key.toLowerCase())) {
        parsed.searchParams.set(key, "***");
        changed = true;
      }
    }

    return changed ? parsed.toString() : url;
  } catch {
    // Best-effort for non-absolute / malformed URLs used in log strings.
    return url.replace(
      /([?&](?:key|api_key|apikey|access_token|access-token|token|secret|client_secret|password|auth)=)[^&]*/gi,
      "$1***"
    );
  }
}
