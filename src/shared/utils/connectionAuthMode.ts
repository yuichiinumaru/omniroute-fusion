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
  id?: string | null;
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
 * Plain connection records only — arrays / boxed primitives are not connections
 * (`typeof [] === "object"` would otherwise false-positive OAuth classification).
 */
function isPlainConnectionRecord(
  conn: unknown
): conn is Exclude<ConnectionAuthShape, null> {
  return conn !== null && typeof conn === "object" && !Array.isArray(conn);
}

/** Optional field bag from `providerSpecificData` after array rejection. */
function asPsdRecord(psd: object): Record<string, unknown> {
  // SAFETY: caller proved plain non-array object; Record is structural view for optional keys.
  return psd as Record<string, unknown>;
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
 * Blank/legacy authType (`unknown`): treat as OAuth only when there is **no**
 * static credential material (`apiKey`, accessToken, or cookie PSD). Cookie
 * sessions stored under blank authType must never enter the #5326 path.
 */
export function connectionUsesOAuthRefresh(conn: ConnectionAuthShape): boolean {
  if (!isPlainConnectionRecord(conn)) return false;
  const normalized = normalizeAuthType(conn.authType);

  if (normalized === "apikey" || normalized === "cookie" || normalized === "none") {
    return false;
  }

  // Missing/legacy authType: non-OAuth when any static credential is present.
  if (normalized === "unknown") {
    if (hasStaticCredential(conn)) return false;
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
  if (!isPlainConnectionRecord(conn)) return false;
  const provider = String(conn.provider || "")
    .toLowerCase()
    .trim();
  if (!LONG_LIVED_IMPORT_PROVIDERS.has(provider)) return false;

  const psd = conn.providerSpecificData;
  let authMethod = "import";
  if (psd && typeof psd === "object" && !Array.isArray(psd)) {
    const raw = asPsdRecord(psd).authMethod;
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
  if (!isPlainConnectionRecord(conn)) return false;
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
  if (!isPlainConnectionRecord(conn)) return false;
  if (hasNonEmptyString(conn.apiKey)) return true;
  if (hasNonEmptyString(conn.accessToken)) return true;

  const psd = conn.providerSpecificData;
  if (psd && typeof psd === "object" && !Array.isArray(psd)) {
    const record = asPsdRecord(psd);
    if (hasNonEmptyString(record.cookie)) return true;
    if (hasNonEmptyString(record.cookies)) return true;
    if (hasNonEmptyString(record.sessionCookie)) return true;
    if (hasNonEmptyString(record.ctoken)) return true;
  }

  return false;
}

/**
 * Terminal statuses that must never be mass-reset by the no_refresh_token heal
 * even if a hybrid `errorCode=no_refresh_token` row were to appear.
 */
const HEAL_EXCLUDED_TEST_STATUSES = new Set(["banned", "credits_exhausted"]);

/**
 * Heal eligibility for false-positive `no_refresh_token` marks.
 * Does **not** heal legitimate #5326 OAuth rows (missing RT on real OAuth).
 *
 * Product false-positive classes that **are** heal-eligible when static
 * credential material remains:
 * - Non-OAuth rows (`apikey` / `cookie` / `none` / blank+static) with
 *   `errorCode`/`lastErrorType` = `no_refresh_token`
 * - Windsurf / Devin long-lived **import** credentials (`isLongLivedImportCredential`)
 *   that are oauth-shaped but product-policy no-RT — these **are** healable
 *   (Task 0035 extension). Legitimate non-import oauth (github, antigravity, …)
 *   remains excluded via `connectionUsesOAuthRefresh` + long-lived gate.
 *
 * Status safety: never heal when `testStatus` is a true terminal other than the
 * dual-mode false-expire class (`banned`, `credits_exhausted`).
 */
export function isFalsePositiveNoRefreshToken(conn: ConnectionAuthShape): boolean {
  if (!isPlainConnectionRecord(conn)) return false;

  const status = typeof conn.testStatus === "string" ? conn.testStatus.trim().toLowerCase() : "";
  if (status && HEAL_EXCLUDED_TEST_STATUSES.has(status)) {
    return false;
  }

  const code = typeof conn.errorCode === "string" ? conn.errorCode : "";
  const errType = typeof conn.lastErrorType === "string" ? conn.lastErrorType : "";
  const isNoRefreshMark = code === "no_refresh_token" || errType === "no_refresh_token";
  if (!isNoRefreshMark) return false;

  // Long-lived import falsely marked no_refresh_token is a product false-positive
  // on an oauth-shaped row — allow heal when credential material is still present.
  if (isLongLivedImportCredential(conn) && hasStaticCredential(conn)) {
    return true;
  }

  if (connectionUsesOAuthRefresh(conn)) return false;

  return hasStaticCredential(conn);
}
