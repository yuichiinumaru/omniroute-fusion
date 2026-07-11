/**
 * Pure unit tests for src/shared/utils/connectionAuthMode.ts
 *
 * Dual-mode inventory (provider ids that can appear as both oauth + apikey):
 *   gemini, qoder, codebuddy-cn
 * Static-only / non-refresh: cookie, blank authType + apiKey, none
 * OAuth #5326 positive: oauth + supports refresh + no RT → mark expired
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeAuthType,
  connectionUsesOAuthRefresh,
  shouldMarkNoRefreshExpired,
  hasStaticCredential,
  isFalsePositiveNoRefreshToken,
} from "../../src/shared/utils/connectionAuthMode.ts";

// ── normalizeAuthType ────────────────────────────────────────────────────────

test("normalizeAuthType maps oauth / apikey aliases / cookie / none / blank", () => {
  assert.equal(normalizeAuthType("oauth"), "oauth");
  assert.equal(normalizeAuthType("OAuth"), "oauth");
  assert.equal(normalizeAuthType("apikey"), "apikey");
  assert.equal(normalizeAuthType("api_key"), "apikey");
  assert.equal(normalizeAuthType("api-key"), "apikey");
  assert.equal(normalizeAuthType("API_KEY"), "apikey");
  assert.equal(normalizeAuthType("cookie"), "cookie");
  assert.equal(normalizeAuthType("none"), "none");
  assert.equal(normalizeAuthType(null), "unknown");
  assert.equal(normalizeAuthType(undefined), "unknown");
  assert.equal(normalizeAuthType(""), "unknown");
  assert.equal(normalizeAuthType("   "), "unknown");
  assert.equal(normalizeAuthType("bearer"), "unknown");
});

// ── connectionUsesOAuthRefresh matrix ────────────────────────────────────────

test("connectionUsesOAuthRefresh is false for apikey / api_key / api-key / cookie / none", () => {
  assert.equal(connectionUsesOAuthRefresh({ authType: "apikey", apiKey: "k" }), false);
  assert.equal(connectionUsesOAuthRefresh({ authType: "api_key", apiKey: "k" }), false);
  assert.equal(connectionUsesOAuthRefresh({ authType: "api-key", apiKey: "k" }), false);
  assert.equal(connectionUsesOAuthRefresh({ authType: "cookie" }), false);
  assert.equal(connectionUsesOAuthRefresh({ authType: "none" }), false);
});

test("connectionUsesOAuthRefresh is true for oauth", () => {
  assert.equal(
    connectionUsesOAuthRefresh({
      authType: "oauth",
      refreshToken: "r",
    }),
    true
  );
  assert.equal(connectionUsesOAuthRefresh({ authType: "oauth" }), true);
});

test("connectionUsesOAuthRefresh blank authType: apiKey false, no apiKey true", () => {
  assert.equal(connectionUsesOAuthRefresh({ authType: null, apiKey: "k" }), false);
  assert.equal(connectionUsesOAuthRefresh({ authType: undefined, apiKey: "k" }), false);
  assert.equal(connectionUsesOAuthRefresh({ authType: "", apiKey: "  k  " }), false);
  assert.equal(connectionUsesOAuthRefresh({ authType: null }), true);
  assert.equal(connectionUsesOAuthRefresh({ authType: undefined, apiKey: "" }), true);
  assert.equal(connectionUsesOAuthRefresh({ authType: null, apiKey: "   " }), true);
});

test("connectionUsesOAuthRefresh rejects null / non-object", () => {
  assert.equal(connectionUsesOAuthRefresh(null), false);
  assert.equal(connectionUsesOAuthRefresh(undefined as unknown as null), false);
});

// ── shouldMarkNoRefreshExpired (#5326 pure gate) ─────────────────────────────

test("shouldMarkNoRefreshExpired preserves #5326 oauth positive case", () => {
  assert.equal(
    shouldMarkNoRefreshExpired(
      {
        authType: "oauth",
        refreshToken: null,
        testStatus: "active",
      },
      true
    ),
    true
  );
  assert.equal(
    shouldMarkNoRefreshExpired(
      {
        authType: "oauth",
        refreshToken: null,
        testStatus: undefined,
      },
      true
    ),
    true
  );
});

test("shouldMarkNoRefreshExpired is false for apikey even when provider supports refresh", () => {
  assert.equal(
    shouldMarkNoRefreshExpired(
      {
        authType: "apikey",
        apiKey: "AQ.fake",
        refreshToken: null,
        testStatus: "active",
      },
      true
    ),
    false
  );
});

test("shouldMarkNoRefreshExpired is false when refresh token present or provider unsupported", () => {
  assert.equal(
    shouldMarkNoRefreshExpired(
      {
        authType: "oauth",
        refreshToken: "present",
        testStatus: "active",
      },
      true
    ),
    false
  );
  assert.equal(
    shouldMarkNoRefreshExpired(
      {
        authType: "oauth",
        refreshToken: null,
        testStatus: "active",
      },
      false
    ),
    false
  );
  assert.equal(
    shouldMarkNoRefreshExpired(
      {
        authType: "oauth",
        refreshToken: null,
        testStatus: "expired",
      },
      true
    ),
    false
  );
});

// ── hasStaticCredential / isFalsePositiveNoRefreshToken ──────────────────────

test("hasStaticCredential detects apiKey, accessToken, and cookie PSD", () => {
  assert.equal(hasStaticCredential({ apiKey: "k" }), true);
  assert.equal(hasStaticCredential({ accessToken: "tok" }), true);
  assert.equal(
    hasStaticCredential({
      providerSpecificData: { cookie: "session=abc" },
    }),
    true
  );
  assert.equal(hasStaticCredential({ authType: "apikey" }), false);
  assert.equal(hasStaticCredential(null), false);
});

test("isFalsePositiveNoRefreshToken heals non-oauth no_refresh_token with credential only", () => {
  assert.equal(
    isFalsePositiveNoRefreshToken({
      authType: "apikey",
      apiKey: "AQ.x",
      errorCode: "no_refresh_token",
    }),
    true
  );
  assert.equal(
    isFalsePositiveNoRefreshToken({
      authType: "oauth",
      errorCode: "no_refresh_token",
      accessToken: "a",
    }),
    false
  );
  assert.equal(
    isFalsePositiveNoRefreshToken({
      authType: "apikey",
      apiKey: "k",
      errorCode: "banned",
    }),
    false
  );
  assert.equal(
    isFalsePositiveNoRefreshToken({
      authType: "apikey",
      errorCode: "no_refresh_token",
    }),
    false
  );
});
