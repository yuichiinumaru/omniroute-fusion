/**
 * Connection auth-mode helpers (dual-mode OAuth vs static credential).
 *
 * Dual-mode providers (gemini, qoder, codebuddy-cn) share one provider id for
 * both OAuth-refreshable accounts and static API keys / free PATs. Health
 * sweep, heal paths, and future UI status mapping must classify **connection**
 * auth mode — never only `supportsTokenRefresh(provider)`.
 *
 * Policy (Epic 0006):
 *   `supportsTokenRefresh(provider)` is **necessary but not sufficient** for
 *   connection expiry / re-auth messaging. Connection-scoped decisions MUST
 *   also pass `connectionUsesOAuthRefresh(conn)` (and Windsurf long-lived
 *   import checks via `isLongLivedImportCredential`).
 *
 * Live false-positive class (2026-07-11): apikey rows marked `no_refresh_token`
 * because provider-level refresh support was applied without this gate.
 */

/** Canonical auth modes used across health / heal / UI contracts. */
export type NormalizedAuthType = "oauth" | "apikey" | "cookie" | "none" | "unknown";

export type ConnectionAuthShape = {
  provider?: string | null;
  authType?: string | null;
  apiKey?: string | null;
  refreshToken?: string | null;
  testStatus?: string | null;
  accessToken?: string | null;
  providerSpecificData?: unknown;
  errorCode?: string | null;
  lastErrorType?: string | null;
} | null;

/**
 * Normalize raw `authType` strings from DB / API into a small canonical set.
 * Maps dual aliases (`api_key`, `api-key`) to `apikey`.
 * Blank / null → `unknown` (callers combine with apiKey presence for OAuth foot-gun).
 */
export function normalizeAuthType(raw: unknown): NormalizedAuthType {
  if (raw === null || raw === undefined) return "unknown";
  const authType = String(raw).toLowerCase().trim();
  if (!authType) return "unknown";
  if (authType === "oauth") return "oauth";
  if (authType === "apikey" || authType === "api_key" || authType === "api-key") {
    return "apikey";
  }
  if (authType === "cookie") return "cookie";
  if (authType === "none") return "none";
  return "unknown";
}

function hasNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Providers whose product path stores long-lived credentials under authType
 * `oauth` without a refresh token. Matches `refreshWindsurfToken` in
 * `open-sse/services/tokenRefresh.ts` (authMethod `"import"` default = no-op).
 *
 * Source of truth for login: `src/lib/oauth/providers/windsurf.ts` import-token
 * (`mapTokens` sets `refreshToken: null`). PKCE browser flow is retired.
 */
const LONG_LIVED_IMPORT_PROVIDERS = new Set(["windsurf", "devin-cli"]);

/**
 * Whether this connection is an OAuth-style credential that can/should use
 * refresh tokens. Static API keys (AI Studio gemini, openai, …), cookies, and
 * no-auth connections must NEVER enter the #5326 "no refresh token → expired"
 * path — they have no refresh token by design.
 *
 * Blank/legacy authType: only treat as OAuth when there is no static apiKey.
 */
export function connectionUsesOAuthRefresh(conn: ConnectionAuthShape): boolean {
  if (!conn || typeof conn !== "object") return false;
  const normalized = normalizeAuthType(conn.authType);

  if (normalized === "apikey" || normalized === "cookie" || normalized === "none") {
    return false;
  }

  // Missing/legacy authType (unknown): only treat as OAuth when there is no static apiKey.
  if (normalized === "unknown") {
    if (hasNonEmptyString(conn.apiKey)) return false;
    return true;
  }

  return normalized === "oauth";
}

/**
 * Windsurf / Devin CLI long-lived import keys (Codeium API keys pasted via
 * `/api/oauth/{windsurf|devin-cli}/import-token`).
 *
 * Product policy: these need **no** refresh token. Do not mark them
 * `no_refresh_token` / expired when RT is absent.
 *
 * Detection aligns with `refreshWindsurfToken`:
 * - provider ∈ {windsurf, devin-cli}
 * - `providerSpecificData.authMethod` missing or `"import"` / `"imported"`
 *   (default when absent is `"import"`)
 * - Firebase / device-code style methods (anything else) are NOT long-lived
 *   and still require a refresh token when the family supports refresh.
 *
 * Verified call sites: `open-sse/services/tokenRefresh.ts` `refreshWindsurfToken`,
 * `src/lib/oauth/providers/windsurf.ts` `mapTokens`.
 */
export function isLongLivedImportCredential(conn: ConnectionAuthShape): boolean {
  if (!conn || typeof conn !== "object") return false;
  const provider = String(conn.provider || "")
    .toLowerCase()
    .trim();
  if (!LONG_LIVED_IMPORT_PROVIDERS.has(provider)) return false;

  const psd = conn.providerSpecificData;
  let authMethod = "import";
  if (psd && typeof psd === "object" && !Array.isArray(psd)) {
    const raw = (psd as Record<string, unknown>).authMethod;
    if (typeof raw === "string" && raw.trim()) {
      authMethod = raw.trim().toLowerCase();
    }
  }

  // Only the import / long-lived path skips refresh. Future Firebase browser
  // flows would set a distinct authMethod and keep requiring RT.
  return authMethod === "import" || authMethod === "imported";
}

/**
 * Pure gate for the #5326 branch: mark expired only when the connection is
 * OAuth-refreshable, the provider supports refresh, there is no usable refresh
 * token, the row is still in a non-terminal sweepable status, and the
 * credential is not a product long-lived import (Windsurf/Devin).
 *
 * Callers pass `supportsTokenRefresh(provider)` as the second arg — that flag
 * alone must never drive expiry without this full gate.
 */
export function shouldMarkNoRefreshExpired(
  conn: ConnectionAuthShape,
  supportsRefresh: boolean
): boolean {
  if (!conn || typeof conn !== "object") return false;
  if (!supportsRefresh) return false;
  if (!connectionUsesOAuthRefresh(conn)) return false;
  if (isLongLivedImportCredential(conn)) return false;

  const hasRefreshToken =
    typeof conn.refreshToken === "string" && conn.refreshToken.length > 0;
  if (hasRefreshToken) return false;

  const status = conn.testStatus;
  return !status || status === "active";
}

/**
 * Whether a non-OAuth connection still has a usable static credential stored
 * (decrypted apiKey, access token, or cookie material in providerSpecificData).
 * Used by heal paths so empty shells are left for the operator.
 */
export function hasStaticCredential(conn: ConnectionAuthShape): boolean {
  if (!conn || typeof conn !== "object") return false;
  if (hasNonEmptyString(conn.apiKey)) return true;
  if (hasNonEmptyString(conn.accessToken)) return true;

  const psd = conn.providerSpecificData;
  if (psd && typeof psd === "object" && !Array.isArray(psd)) {
    const record = psd as Record<string, unknown>;
    if (hasNonEmptyString(record.cookie)) return true;
    if (hasNonEmptyString(record.cookies)) return true;
    if (hasNonEmptyString(record.sessionCookie)) return true;
    if (hasNonEmptyString(record.ctoken)) return true;
  }

  return false;
}

/**
 * Heal eligibility for false-positive `no_refresh_token` on non-OAuth rows.
 * Does **not** heal legitimate #5326 OAuth rows.
 *
 * Note: Windsurf long-lived oauth imports incorrectly marked `no_refresh_token`
 * are handled by not re-marking them (isLongLivedImportCredential) + Task 0034
 * heal predicate may leave pure-oauth false-positives to operator retest.
 * Long-lived windsurf rows still have connectionUsesOAuthRefresh=true, so they
 * are intentionally excluded from the apikey heal path.
 */
export function isFalsePositiveNoRefreshToken(conn: ConnectionAuthShape): boolean {
  if (!conn || typeof conn !== "object") return false;
  // Long-lived import falsely marked no_refresh_token is a product false-positive
  // on an oauth-shaped row — allow heal when credential material is still present.
  if (isLongLivedImportCredential(conn) && hasStaticCredential(conn)) {
    const code = typeof conn.errorCode === "string" ? conn.errorCode : "";
    const errType = typeof conn.lastErrorType === "string" ? conn.lastErrorType : "";
    if (code === "no_refresh_token" || errType === "no_refresh_token") {
      return true;
    }
  }

  if (connectionUsesOAuthRefresh(conn)) return false;

  const code = typeof conn.errorCode === "string" ? conn.errorCode : "";
  const errType = typeof conn.lastErrorType === "string" ? conn.lastErrorType : "";
  if (code !== "no_refresh_token" && errType !== "no_refresh_token") {
    return false;
  }

  return hasStaticCredential(conn);
}
