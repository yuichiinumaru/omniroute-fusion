/**
 * Auth-status presentation adapters for Providers hub UI (Epic 0007 Task 0038).
 *
 * Pure wrappers around `formatConnectionStatusMessage` with the exact prop
 * shapes used by ProviderCard + ConnectionRow. Keeps React components free of
 * duplicated auth-mode conditionals.
 */

import type { StatusBadgeVariant } from "@/shared/constants/statusVocabulary";
import type { StatusTone } from "@/shared/constants/statusVocabulary";
import {
  CONNECTION_STATUS_COPY_IDS,
  formatConnectionStatusMessage,
  type ConnectionStatusCopy,
  type ConnectionStatusCopyInput,
} from "@/shared/utils/connectionStatusCopy";

/** Stats / connection fields ProviderCard + page aggregation pass into the helper. */
export type ProviderCardAuthStatusInput = {
  authType?: string | null;
  /** Aggregated chip from expiration API / connection flags. */
  expiryStatus?: string | null;
  lastErrorType?: string | null;
  lastError?: string | null;
  /**
   * Structured code from the latest failing connection (`errorCode` column),
   * NOT the human display tag shown in the error-count badge ("Auth", "429").
   */
  rawErrorCode?: string | number | null;
  latestTestStatus?: string | null;
};

export type ConnectionErrorDisplayInput = {
  authType?: string | null;
  testStatus?: string | null;
  errorCode?: string | number | null;
  lastErrorType?: string | null;
  lastError?: string | null;
  expiryStatus?: string | null;
};

export type ConnectionErrorDisplay = Readonly<{
  /** Operator-visible error line (may rewrite OAuth false-positive lastError). */
  text: string;
  /** Tooltip / title attribute. */
  title: string;
  /** Full helper result when an override applied; null when raw lastError kept. */
  copy: ConnectionStatusCopy | null;
  /** True when lastError was rewritten away from OAuth re-auth primary language. */
  rewritten: boolean;
}>;

/** Map helper tone → shared Badge variant (danger → error). */
export function connectionStatusToneToBadgeVariant(tone: StatusTone): StatusBadgeVariant {
  switch (tone) {
    case "success":
      return "success";
    case "warning":
      return "warning";
    case "danger":
      return "error";
    case "info":
      return "info";
    default:
      return "default";
  }
}

/**
 * Map ProviderCard category `authType` (oauth / apikey / compatible / web-cookie / …)
 * onto the credential modes the formatter understands. Category labels like
 * `compatible` must not fall through to unknown→oauth re-auth.
 */
export function mapProviderCardAuthTypeToCredentialMode(
  authType: string | null | undefined
): string {
  if (authType == null) return "apikey";
  const a = String(authType).toLowerCase().trim();
  if (!a) return "apikey";
  if (a === "oauth" || a === "free") return "oauth";
  if (a === "web-cookie" || a === "cookie" || a === "webcookie") return "cookie";
  if (a === "no-auth" || a === "noauth" || a === "none") return "none";
  if (
    a === "apikey" ||
    a === "api_key" ||
    a === "api-key" ||
    a === "compatible" ||
    a === "local" ||
    a === "search" ||
    a === "audio" ||
    a === "cloud-agent" ||
    a === "cloudagent" ||
    a === "upstream-proxy" ||
    a === "upstreamproxy"
  ) {
    return "apikey";
  }
  return a;
}

function toCopyInput(input: ProviderCardAuthStatusInput): ConnectionStatusCopyInput {
  return {
    authType: mapProviderCardAuthTypeToCredentialMode(input.authType),
    testStatus: input.latestTestStatus,
    errorCode: input.rawErrorCode != null ? String(input.rawErrorCode) : null,
    lastErrorType: input.lastErrorType,
    lastError: input.lastError,
    expiryStatus: input.expiryStatus,
  };
}

/**
 * Whether ProviderCard should render the auth-status badge (replaces generic
 * `expiredBadge` when expired, and covers false-positive no_refresh_token rows
 * that may not yet have expiryStatus from the OAuth-centric expiration API).
 */
export function shouldShowProviderCardAuthStatusBadge(
  input: ProviderCardAuthStatusInput
): boolean {
  if (input.expiryStatus === "expired") return true;
  const code = String(input.rawErrorCode ?? "")
    .toLowerCase()
    .trim();
  const errType = String(input.lastErrorType ?? "")
    .toLowerCase()
    .trim();
  if (code === "no_refresh_token" || errType === "no_refresh_token") return true;
  if (
    code === "refresh_failed" ||
    errType === "refresh_failed" ||
    errType === "token_refresh_failed"
  ) {
    return true;
  }
  if (errType === "token_expired") return true;
  const status = String(input.latestTestStatus ?? "")
    .toLowerCase()
    .trim();
  if (status === "expired") return true;
  return false;
}

/**
 * Resolve auth-status badge copy for ProviderCard from the stats shape the
 * providers page builds. Returns null when no auth-status chip should show.
 * Never returns healthy copy for this surface (healthy rows skip the chip).
 */
export function resolveProviderCardAuthStatusCopy(
  input: ProviderCardAuthStatusInput | null | undefined
): ConnectionStatusCopy | null {
  if (!input || !shouldShowProviderCardAuthStatusBadge(input)) return null;
  const copy = formatConnectionStatusMessage(toCopyInput(input));
  if (copy.id === CONNECTION_STATUS_COPY_IDS.healthy) return null;
  return copy;
}

/**
 * Connection-row lastError presentation: for apikey/cookie false OAuth
 * lastError strings, surface helper detail instead of "re-authenticate this account."
 * OAuth rows keep re-auth-capable copy (detail from helper when taxonomy hits,
 * otherwise raw lastError).
 */
export function resolveConnectionErrorDisplay(
  input: ConnectionErrorDisplayInput | null | undefined
): ConnectionErrorDisplay | null {
  const raw =
    input && typeof input.lastError === "string" ? input.lastError.trim() : "";
  if (!raw) return null;

  const copy = formatConnectionStatusMessage({
    authType: input?.authType,
    testStatus: input?.testStatus,
    errorCode: input?.errorCode != null ? String(input.errorCode) : null,
    lastErrorType: input?.lastErrorType,
    lastError: raw,
    expiryStatus: input?.expiryStatus,
  });

  const rewriteIds = new Set<string>([
    CONNECTION_STATUS_COPY_IDS.apikeyNoRefreshToken,
    CONNECTION_STATUS_COPY_IDS.apikeyInvalidKey,
    CONNECTION_STATUS_COPY_IDS.apikeyGenericError,
    CONNECTION_STATUS_COPY_IDS.cookieUpdate,
  ]);

  // Rewrite when helper classified a non-OAuth credential mode with an error.
  if (rewriteIds.has(copy.id)) {
    return {
      text: copy.detail,
      title: `${copy.title} — ${copy.cta}`,
      copy,
      rewritten: true,
    };
  }

  // OAuth (and unknown) keep raw lastError so upstream detail is preserved;
  // helper still available via `copy` for callers that want badge/CTA.
  return {
    text: raw,
    title: raw,
    copy,
    rewritten: false,
  };
}
