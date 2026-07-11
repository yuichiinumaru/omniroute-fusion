const PUBLIC_API_ROUTE_PREFIXES = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/status",
  "/api/init",
  "/api/v1/",
  // Cloud worker helpers (auth / model resolve / aliases). Credential mutation
  // under /api/cloud/credentials/ is intentionally NOT public (Task 0049 / F-07-006).
  "/api/cloud/auth",
  "/api/cloud/model",
  "/api/cloud/models",
  "/api/sync/bundle",
  "/api/oauth/",
  // Public, ticket-gated Codex device-flow completion (validate + persist).
  // The handler enforces its own single-use ticket check; no dashboard auth.
  "/api/codex/connect/",
  // Remote-mode bootstrap: exchange the management password for a scoped CLI
  // access token. The handler enforces its own password check + lockout — there
  // is no token yet at this point, so it cannot require management auth.
  "/api/cli/connect",
];

const PUBLIC_READONLY_API_ROUTE_PREFIXES = [
  "/api/monitoring/health",
  // Lightweight liveness for k8s / FeatureFlagsGrid restart probes (F-07-010).
  "/api/health/ping",
  "/api/settings/require-login",
];

const PUBLIC_READONLY_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Segment-safe prefix match so `/api/cloud/auth` does not match
 * `/api/cloud/authorize` or `/api/cloud/credentials`.
 */
function pathMatchesPublicPrefix(pathname: string, prefix: string): boolean {
  if (prefix.endsWith("/")) {
    return pathname === prefix.slice(0, -1) || pathname.startsWith(prefix);
  }
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isPublicApiRoute(pathname: string, method = "GET"): boolean {
  if (PUBLIC_API_ROUTE_PREFIXES.some((route) => pathMatchesPublicPrefix(pathname, route))) {
    return true;
  }

  if (!PUBLIC_READONLY_METHODS.has(String(method).toUpperCase())) {
    return false;
  }

  return PUBLIC_READONLY_API_ROUTE_PREFIXES.some((route) =>
    pathMatchesPublicPrefix(pathname, route)
  );
}

export { PUBLIC_API_ROUTE_PREFIXES, PUBLIC_READONLY_API_ROUTE_PREFIXES, PUBLIC_READONLY_METHODS };
