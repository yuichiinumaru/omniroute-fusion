/**
 * Pure unit tests for src/shared/utils/connectionStatusCopy.ts
 *
 * Epic 0007 Task 0037 — auth-mode-aware status copy matrix.
 * Binary rule: apikey + no_refresh_token MUST NEVER primary-CTA OAuth re-auth.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  formatConnectionStatusMessage,
  CONNECTION_STATUS_COPY_IDS,
  type ConnectionStatusCopy,
} from "../../src/shared/utils/connectionStatusCopy.ts";

const OAUTH_FORBIDDEN_ON_APIKEY =
  /refresh\s*token|re-?authenticat|oauth|sign\s*in\s*(again)?|log\s*in\s*(again)?/i;

function assertNoOAuthCtaOnApikey(copy: ConnectionStatusCopy): void {
  assert.match(copy.cta, /key|re-?test|rotate|update\s*key|health/i);
  assert.doesNotMatch(copy.cta, OAUTH_FORBIDDEN_ON_APIKEY);
  assert.doesNotMatch(copy.title, OAUTH_FORBIDDEN_ON_APIKEY);
  assert.doesNotMatch(copy.badge, /oauth/i);
  // detail may quote sanitized context but primary CTA/title must stay key-oriented
  assert.doesNotMatch(copy.detail, /re-?authenticate this account/i);
}

// ── 1. gemini-like apikey + no_refresh_token ─────────────────────────────────

test("apikey + no_refresh_token: no refresh-token / OAuth re-auth primary CTA", () => {
  const copy = formatConnectionStatusMessage({
    authType: "apikey",
    testStatus: "expired",
    errorCode: "no_refresh_token",
    lastErrorType: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
    expiryStatus: "expired",
  });

  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.apikeyNoRefreshToken);
  assertNoOAuthCtaOnApikey(copy);
  assert.match(copy.cta, /re-?test|rotate|key/i);
  assert.equal(copy.tone, "warning");
  assert.ok(copy.keys?.cta, "stable key for 0039 i18n handoff");
});

test("api_key alias + no_refresh_token: same non-OAuth copy (dual-mode gemini/qoder)", () => {
  const copy = formatConnectionStatusMessage({
    authType: "api_key",
    errorCode: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
  });
  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.apikeyNoRefreshToken);
  assertNoOAuthCtaOnApikey(copy);
});

// ── 2. oauth + no_refresh_token → re-auth allowed ────────────────────────────

test("oauth + no_refresh_token: re-auth messaging allowed", () => {
  const copy = formatConnectionStatusMessage({
    authType: "oauth",
    testStatus: "expired",
    errorCode: "no_refresh_token",
    lastErrorType: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
    expiryStatus: "expired",
  });

  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.oauthNoRefreshToken);
  assert.match(copy.cta, /re-?authenticat|re-?import|sign\s*in|log\s*in/i);
  assert.match(`${copy.title} ${copy.detail} ${copy.cta}`, /refresh|re-?auth|token/i);
  assert.equal(copy.tone, "danger");
});

// ── 3. apikey + 401 / invalid key ────────────────────────────────────────────

test("apikey + 401 / invalid key: key rotation language", () => {
  const byCode = formatConnectionStatusMessage({
    authType: "apikey",
    errorCode: "401",
    lastError: "Unauthorized",
  });
  assert.equal(byCode.id, CONNECTION_STATUS_COPY_IDS.apikeyInvalidKey);
  assert.match(byCode.cta, /rotate|update|replace|re-?enter|key/i);
  assert.doesNotMatch(byCode.cta, /re-?authenticat|oauth|refresh\s*token/i);

  const byType = formatConnectionStatusMessage({
    authType: "api-key",
    lastErrorType: "upstream_auth_error",
    lastError: "Invalid API key",
  });
  assert.equal(byType.id, CONNECTION_STATUS_COPY_IDS.apikeyInvalidKey);
  assert.match(byType.cta, /key/i);
  assert.doesNotMatch(byType.cta, /oauth/i);

  const byMsg = formatConnectionStatusMessage({
    authType: "apikey",
    lastError: "invalid api key provided",
  });
  assert.equal(byMsg.id, CONNECTION_STATUS_COPY_IDS.apikeyInvalidKey);
});

// ── 4. oauth + refresh_failed ────────────────────────────────────────────────

test("oauth + refresh_failed: refresh / re-auth language", () => {
  const byCode = formatConnectionStatusMessage({
    authType: "oauth",
    errorCode: "refresh_failed",
    lastErrorType: "token_refresh_failed",
    lastError: "Refresh token rejected (invalid_grant).",
  });
  assert.equal(byCode.id, CONNECTION_STATUS_COPY_IDS.oauthRefreshFailed);
  assert.match(byCode.cta, /re-?authenticat|refresh|re-?import|sign\s*in/i);
  assert.match(`${byCode.title} ${byCode.detail}`, /refresh|token|auth/i);
  assert.equal(byCode.tone, "danger");

  const byType = formatConnectionStatusMessage({
    authType: "oauth",
    lastErrorType: "token_refresh_failed",
  });
  assert.equal(byType.id, CONNECTION_STATUS_COPY_IDS.oauthRefreshFailed);
});

// ── 5. cookie + error → re-paste ─────────────────────────────────────────────

test("cookie + error: cookie re-paste language", () => {
  const copy = formatConnectionStatusMessage({
    authType: "cookie",
    testStatus: "error",
    errorCode: "401",
    lastError: "Session expired",
  });
  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.cookieUpdate);
  assert.match(copy.cta, /cookie|paste|session/i);
  assert.match(`${copy.title} ${copy.detail} ${copy.cta}`, /cookie|session/i);
  assert.doesNotMatch(copy.cta, /oauth|refresh\s*token/i);
});

test("cookie + no_refresh_token false-positive: still cookie language, not OAuth", () => {
  const copy = formatConnectionStatusMessage({
    authType: "cookie",
    errorCode: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
  });
  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.cookieUpdate);
  assert.match(copy.cta, /cookie|paste|session/i);
  assert.doesNotMatch(copy.cta, /oauth|refresh\s*token/i);
});

// ── pure helper contract ─────────────────────────────────────────────────────

test("helper is pure: same input → same output; no thrown i18n dependency", () => {
  const input = {
    authType: "apikey" as const,
    errorCode: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
  };
  const a = formatConnectionStatusMessage(input);
  const b = formatConnectionStatusMessage(input);
  assert.deepEqual(a, b);
  assert.equal(typeof a.badge, "string");
  assert.equal(typeof a.title, "string");
  assert.equal(typeof a.detail, "string");
  assert.equal(typeof a.cta, "string");
  assert.ok(a.id);
  assert.ok(a.keys);
});

test("healthy / active connection without error returns healthy copy", () => {
  const copy = formatConnectionStatusMessage({
    authType: "oauth",
    testStatus: "active",
  });
  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.healthy);
  assert.equal(copy.tone, "success");
});

test("legacy apikey false no_refresh_token (pre-heal) uses neutral retest, not OAuth", () => {
  // Explicit matrix row from task: neutral “needs re-test” / health glitch
  const copy = formatConnectionStatusMessage({
    authType: "apikey",
    errorCode: "no_refresh_token",
    lastErrorType: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
  });
  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.apikeyNoRefreshToken);
  assert.match(copy.title + " " + copy.detail, /re-?test|health|credential|key/i);
  assertNoOAuthCtaOnApikey(copy);
});
