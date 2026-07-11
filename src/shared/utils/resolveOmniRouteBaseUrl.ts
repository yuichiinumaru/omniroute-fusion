const DEFAULT_OMNIROUTE_BASE_URL = "http://localhost:20128";

type OmniRouteBaseUrlEnv = {
  OMNIROUTE_BASE_URL?: string;
  BASE_URL?: string;
  NEXT_PUBLIC_BASE_URL?: string;
};

function normalizeBaseUrl(value?: string): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

export function resolveOmniRouteBaseUrl(env: OmniRouteBaseUrlEnv = process.env): string {
  return (
    normalizeBaseUrl(env.OMNIROUTE_BASE_URL) ||
    normalizeBaseUrl(env.BASE_URL) ||
    normalizeBaseUrl(env.NEXT_PUBLIC_BASE_URL) ||
    DEFAULT_OMNIROUTE_BASE_URL
  );
}

/**
 * True when the URL host is process-local loopback (F-04-W2-002 host pin).
 * Used before forwarding management cookies / bearer credentials.
 */
export function isLoopbackOmniRouteBaseUrl(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return host === "localhost" || host === "127.0.0.1" || host === "::1";
  } catch {
    return false;
  }
}

/**
 * Refuse credentialed internal fetches to non-loopback hosts (SSRF / cookie leak).
 */
export function assertCredentialSafeOmniRouteBaseUrl(
  baseUrl: string,
  hasCredentials: boolean
): void {
  if (!hasCredentials) return;
  if (isLoopbackOmniRouteBaseUrl(baseUrl)) return;
  let host = baseUrl;
  try {
    host = new URL(baseUrl).host;
  } catch {
    // keep raw
  }
  throw new Error(
    `Refusing to forward credentials to non-loopback OmniRoute base URL (${host}). ` +
      `Set OMNIROUTE_BASE_URL to a loopback origin (e.g. http://127.0.0.1:20128).`
  );
}

export { DEFAULT_OMNIROUTE_BASE_URL };
