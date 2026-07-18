/**
 * Connection auth-status copy helper (Epic 0007 Task 0037).
 *
 * Pure formatter for Providers hub surfaces (ProviderCard, ProviderLimits).
 * Auth-mode-aware: apikey rows must NEVER surface primary OAuth re-auth CTAs
 * even when legacy `lastError` still contains "No refresh token available —
 * re-authenticate this account." (pre-heal false-positives).
 *
 * Wiring into UI is Tasks 0038 / 0039 — this module is helper + keys only.
 *
 * i18n handoff (0039): each result exposes stable `id` + `keys.*` message-key
 * strings; English defaults live in `badge` / `title` / `detail` / `cta`.
 */

import type { StatusTone } from "@/shared/constants/statusVocabulary";
import { normalizeAuthType } from "@/shared/utils/connectionAuthMode";

/** Stable scenario ids — map 1:1 to i18n keys under connectionStatus.* in 0039. */
export const CONNECTION_STATUS_COPY_IDS = {
  healthy: "healthy",
  apikeyNoRefreshToken: "apikey_no_refresh_token",
  apikeyInvalidKey: "apikey_invalid_key",
  apikeyGenericError: "apikey_generic_error",
  oauthNoRefreshToken: "oauth_no_refresh_token",
  oauthRefreshFailed: "oauth_refresh_failed",
  oauthGenericError: "oauth_generic_error",
  cookieUpdate: "cookie_update",
  genericError: "generic_error",
  expired: "expired",
} as const;

export type ConnectionStatusCopyId =
  (typeof CONNECTION_STATUS_COPY_IDS)[keyof typeof CONNECTION_STATUS_COPY_IDS];

export type ConnectionStatusCopyInput = {
  authType?: string | null;
  testStatus?: string | null;
  errorCode?: string | null;
  lastErrorType?: string | null;
  lastError?: string | null;
  /** Aggregated expiry chip: "expired" | "expiring_soon" | … */
  expiryStatus?: string | null;
};

export type ConnectionStatusCopyKeys = Readonly<{
  badge: string;
  title: string;
  detail: string;
  cta: string;
}>;

export type ConnectionStatusCopy = Readonly<{
  /** Stable scenario id for i18n / analytics. */
  id: ConnectionStatusCopyId;
  badge: string;
  title: string;
  detail: string;
  cta: string;
  tone: StatusTone;
  /** Message keys for 0039 (`connectionStatus.<id>.*`). */
  keys: ConnectionStatusCopyKeys;
}>;

type ErrorSignal =
  | "no_refresh_token"
  | "refresh_failed"
  | "invalid_key"
  | "expired"
  | "generic"
  | "none";

function keyBundle(id: ConnectionStatusCopyId): ConnectionStatusCopyKeys {
  const base = `connectionStatus.${id}`;
  return {
    badge: `${base}.badge`,
    title: `${base}.title`,
    detail: `${base}.detail`,
    cta: `${base}.cta`,
  };
}

function pack(
  id: ConnectionStatusCopyId,
  fields: { badge: string; title: string; detail: string; cta: string; tone: StatusTone }
): ConnectionStatusCopy {
  return { id, ...fields, keys: keyBundle(id) };
}

function normCode(raw: unknown): string {
  if (raw === null || raw === undefined) return "";
  return String(raw).toLowerCase().trim();
}

/**
 * Prefer structured errorCode / lastErrorType over free-text lastError.
 * lastError is only used as a fallback classifier (never as OAuth CTA driver
 * for apikey rows).
 */
function resolveErrorSignal(input: ConnectionStatusCopyInput): ErrorSignal {
  const code = normCode(input.errorCode);
  const errType = normCode(input.lastErrorType);
  const status = normCode(input.testStatus);
  const expiry = normCode(input.expiryStatus);
  const msg = typeof input.lastError === "string" ? input.lastError.toLowerCase() : "";

  if (code === "no_refresh_token" || errType === "no_refresh_token") {
    return "no_refresh_token";
  }
  if (
    code === "refresh_failed" ||
    errType === "refresh_failed" ||
    errType === "token_refresh_failed" ||
    (msg.includes("refresh failed") && msg.includes("token"))
  ) {
    return "refresh_failed";
  }
  if (
    code === "401" ||
    code === "403" ||
    errType === "upstream_auth_error" ||
    errType === "auth_missing" ||
    errType === "invalid_api_key" ||
    errType === "invalid_key" ||
    /\binvalid\s+api[\s_-]?key\b/.test(msg) ||
    /\bapi[\s_-]?key\s+(?:is\s+)?(?:invalid|incorrect|revoked|expired)\b/.test(msg)
  ) {
    return "invalid_key";
  }
  if (
    errType === "token_expired" ||
    status === "expired" ||
    expiry === "expired" ||
    code === "expired"
  ) {
    return "expired";
  }
  if (status === "error" || status === "unavailable" || status === "failed" || code || errType || msg) {
    return "generic";
  }
  return "none";
}

function isHealthyStatus(input: ConnectionStatusCopyInput, signal: ErrorSignal): boolean {
  if (signal !== "none") return false;
  const status = normCode(input.testStatus);
  if (!status || status === "active" || status === "success" || status === "connected") {
    return true;
  }
  return false;
}

/**
 * Auth-mode-aware message for ProviderLimits / quota-widget 401 paths.
 * Replaces the hard-coded `` `${errorMsg} — re-authenticate this account.` `` suffix:
 * apikey/cookie never get an OAuth re-auth primary CTA; oauth keeps re-auth language.
 *
 * Pure: no i18n runtime. Callers resolve `copy.keys.*` via next-intl when available.
 */
export function formatQuotaAuthErrorMessage(
  input: ConnectionStatusCopyInput | null | undefined
): Readonly<{ copy: ConnectionStatusCopy; message: string }> {
  const safe: ConnectionStatusCopyInput =
    input && typeof input === "object" ? input : {};
  const copy = formatConnectionStatusMessage({
    ...safe,
    // Quota 401 path implies auth rejection when no structured code is present.
    errorCode: safe.errorCode ?? "401",
  });
  return { copy, message: copy.detail };
}

/**
 * Format operator-facing status copy for a provider connection.
 * Pure: no i18n runtime, no DOM, no side effects.
 */
export function formatConnectionStatusMessage(
  input: ConnectionStatusCopyInput | null | undefined
): ConnectionStatusCopy {
  const safe: ConnectionStatusCopyInput =
    input && typeof input === "object" ? input : {};
  const auth = normalizeAuthType(safe.authType);
  const signal = resolveErrorSignal(safe);

  if (isHealthyStatus(safe, signal)) {
    return pack(CONNECTION_STATUS_COPY_IDS.healthy, {
      badge: "Healthy",
      title: "Connection healthy",
      detail: "Credential is active and ready for traffic.",
      cta: "Retest connection",
      tone: "success",
    });
  }

  // ── Cookie: always re-paste language (never OAuth refresh CTA) ───────────
  if (auth === "cookie") {
    return pack(CONNECTION_STATUS_COPY_IDS.cookieUpdate, {
      badge: "Session",
      title: "Session cookie needs update",
      detail: "This connection uses a session cookie, not an OAuth refresh token.",
      cta: "Update cookie",
      tone: "warning",
    });
  }

  // ── API key / static credential ──────────────────────────────────────────
  if (auth === "apikey" || auth === "none") {
    if (signal === "no_refresh_token") {
      // Legacy false-positive rows may still carry OAuth lastError text.
      return pack(CONNECTION_STATUS_COPY_IDS.apikeyNoRefreshToken, {
        badge: "Retest",
        title: "Needs re-test",
        detail: "API-key credential flagged by a health glitch. Retest or rotate the key.",
        cta: "Retest connection",
        tone: "warning",
      });
    }
    if (signal === "invalid_key") {
      return pack(CONNECTION_STATUS_COPY_IDS.apikeyInvalidKey, {
        badge: "Invalid key",
        title: "API key rejected",
        detail: "Upstream rejected this API key. Rotate or re-enter a valid key.",
        cta: "Rotate API key",
        tone: "danger",
      });
    }
    if (signal === "expired") {
      return pack(CONNECTION_STATUS_COPY_IDS.expired, {
        badge: "Expired",
        title: "API key needs attention",
        detail: "This API-key connection is marked expired or unusable. Rotate or retest the key.",
        cta: "Rotate API key",
        tone: "danger",
      });
    }
    return pack(CONNECTION_STATUS_COPY_IDS.apikeyGenericError, {
      badge: "Error",
      title: "Connection error",
      detail: "Retest this API-key connection or rotate the key if the error persists.",
      cta: "Retest connection",
      tone: "warning",
    });
  }

  // ── OAuth (explicit authType only) ───────────────────────────────────────
  if (auth === "oauth") {
    if (signal === "no_refresh_token") {
      return pack(CONNECTION_STATUS_COPY_IDS.oauthNoRefreshToken, {
        badge: "Re-auth",
        title: "Refresh token missing",
        detail: "No refresh token available — re-authenticate this account.",
        cta: "Re-authenticate",
        tone: "danger",
      });
    }
    if (signal === "refresh_failed") {
      return pack(CONNECTION_STATUS_COPY_IDS.oauthRefreshFailed, {
        badge: "Refresh failed",
        title: "Token refresh failed",
        detail: "Refresh token was rejected or consumed. Re-authenticate this account.",
        cta: "Re-authenticate",
        tone: "danger",
      });
    }
    if (signal === "expired") {
      return pack(CONNECTION_STATUS_COPY_IDS.expired, {
        badge: "Expired",
        title: "Credential expired",
        detail: "OAuth credential is expired. Re-authenticate this account.",
        cta: "Re-authenticate",
        tone: "danger",
      });
    }
    if (signal === "invalid_key") {
      return pack(CONNECTION_STATUS_COPY_IDS.oauthGenericError, {
        badge: "Auth failed",
        title: "Authentication failed",
        detail: "OAuth credential is invalid. Re-authenticate this account.",
        cta: "Re-authenticate",
        tone: "danger",
      });
    }
    return pack(CONNECTION_STATUS_COPY_IDS.oauthGenericError, {
      badge: "Error",
      title: "Connection error",
      detail: "Retest this OAuth connection or re-authenticate if the error persists.",
      cta: "Retest connection",
      tone: "warning",
    });
  }

  // ── Unknown / blank authType ─────────────────────────────────────────────
  // Dual-mode false-positives often arrive with blank authType + no_refresh_token.
  // Never invent OAuth re-auth as the primary CTA; only refresh_failed implies
  // OAuth token machinery. Call sites that know the mode must pass authType
  // (ProviderCard maps category labels; ConnectionRow uses DB authType).
  if (auth === "unknown") {
    if (signal === "refresh_failed") {
      return pack(CONNECTION_STATUS_COPY_IDS.oauthRefreshFailed, {
        badge: "Refresh failed",
        title: "Token refresh failed",
        detail: "Refresh token was rejected or consumed. Re-authenticate this account.",
        cta: "Re-authenticate",
        tone: "danger",
      });
    }
    if (signal === "no_refresh_token") {
      return pack(CONNECTION_STATUS_COPY_IDS.apikeyNoRefreshToken, {
        badge: "Retest",
        title: "Needs re-test",
        detail: "Credential mode unknown; health flagged a refresh-token issue. Retest or set auth type.",
        cta: "Retest connection",
        tone: "warning",
      });
    }
    if (signal === "invalid_key") {
      return pack(CONNECTION_STATUS_COPY_IDS.apikeyInvalidKey, {
        badge: "Invalid key",
        title: "API key rejected",
        detail: "Upstream rejected this credential. Rotate or re-enter a valid key.",
        cta: "Rotate API key",
        tone: "danger",
      });
    }
    if (signal === "expired") {
      return pack(CONNECTION_STATUS_COPY_IDS.expired, {
        badge: "Expired",
        title: "Credential needs attention",
        detail: "Connection is marked expired. Retest or update the credential.",
        cta: "Retest connection",
        tone: "danger",
      });
    }
    return pack(CONNECTION_STATUS_COPY_IDS.genericError, {
      badge: "Error",
      title: "Connection error",
      detail: "Retest this connection.",
      cta: "Retest connection",
      tone: "warning",
    });
  }

  // Fallback (should be unreachable given NormalizedAuthType exhaustiveness)
  return pack(CONNECTION_STATUS_COPY_IDS.genericError, {
    badge: "Error",
    title: "Connection error",
    detail: "Retest this connection.",
    cta: "Retest connection",
    tone: "warning",
  });
}
