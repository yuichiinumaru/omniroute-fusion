/**
 * ProviderLimits / quota 401 path — auth-mode-aware copy (Epic 0007 Task 0039).
 *
 * Guards the primary offender: hard-coded
 *   `${errorMsg} — re-authenticate this account.`
 * must never be applied to apikey/cookie rows.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import {
  formatQuotaAuthErrorMessage,
  formatConnectionStatusMessage,
  CONNECTION_STATUS_COPY_IDS,
} from "../../src/shared/utils/connectionStatusCopy.ts";

const OAUTH_SUFFIX = /re-authenticate this account/i;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

// ── Limits 401 matrix ────────────────────────────────────────────────────────

test("limits 401 + apikey: no OAuth re-auth suffix; key-oriented detail", () => {
  const { copy, message } = formatQuotaAuthErrorMessage({
    authType: "apikey",
    lastError: "Unauthorized",
  });

  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.apikeyInvalidKey);
  assert.doesNotMatch(message, OAUTH_SUFFIX);
  assert.doesNotMatch(message, /refresh\s*token/i);
  assert.match(message, /api key|rotate|re-?enter|key/i);
  assert.match(copy.cta, /rotate|key|re-?test/i);
  assert.doesNotMatch(copy.cta, /re-?authenticat/i);
  assert.equal(copy.keys.detail, "connectionStatus.apikey_invalid_key.detail");
});

test("limits 401 + api_key alias: same non-OAuth copy (dual-mode)", () => {
  const { message, copy } = formatQuotaAuthErrorMessage({
    authType: "api_key",
    errorCode: "401",
    lastError: "HTTP 401 Unauthorized",
  });
  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.apikeyInvalidKey);
  assert.doesNotMatch(message, OAUTH_SUFFIX);
});

test("limits 401 + oauth: re-auth language allowed", () => {
  const { copy, message } = formatQuotaAuthErrorMessage({
    authType: "oauth",
    lastError: "Unauthorized",
  });
  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.oauthGenericError);
  assert.match(message, /re-authenticate|oauth|expired|invalid/i);
  assert.match(copy.cta, /re-?authenticat|re-?test/i);
});

test("limits 401 + cookie: cookie update language, not OAuth re-auth", () => {
  const { copy, message } = formatQuotaAuthErrorMessage({
    authType: "cookie",
    lastError: "Unauthorized",
  });
  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.cookieUpdate);
  assert.doesNotMatch(message, OAUTH_SUFFIX);
  assert.match(`${message} ${copy.cta}`, /cookie|session/i);
});

test("limits 401 + apikey + legacy no_refresh_token lastError: still no OAuth CTA", () => {
  // Explicit errorCode no_refresh_token (false-positive pre-heal) on apikey
  const { copy, message } = formatQuotaAuthErrorMessage({
    authType: "apikey",
    errorCode: "no_refresh_token",
    lastErrorType: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
  });
  assert.equal(copy.id, CONNECTION_STATUS_COPY_IDS.apikeyNoRefreshToken);
  assert.doesNotMatch(message, OAUTH_SUFFIX);
  assert.match(message, /re-?test|rotate|api-?key|credential/i);
});

test("formatQuotaAuthErrorMessage defaults missing errorCode to 401", () => {
  const a = formatQuotaAuthErrorMessage({ authType: "apikey", lastError: "fail" });
  const b = formatConnectionStatusMessage({
    authType: "apikey",
    errorCode: "401",
    lastError: "fail",
  });
  assert.deepEqual(a.copy, b);
  assert.equal(a.message, b.detail);
});

// ── EN i18n key presence (providers + usage namespaces) ──────────────────────

test("EN i18n: usage.connectionStatus and providers.connectionStatus cover helper ids", () => {
  const en = JSON.parse(readFileSync(path.join(ROOT, "src/i18n/messages/en.json"), "utf8"));
  const ids = Object.values(CONNECTION_STATUS_COPY_IDS);
  const fields = ["badge", "title", "detail", "cta"] as const;

  for (const ns of ["usage", "providers"] as const) {
    const block = en[ns]?.connectionStatus;
    assert.ok(block && typeof block === "object", `${ns}.connectionStatus must exist`);
    for (const id of ids) {
      const entry = block[id];
      assert.ok(entry && typeof entry === "object", `${ns}.connectionStatus.${id} missing`);
      for (const field of fields) {
        assert.equal(
          typeof entry[field],
          "string",
          `${ns}.connectionStatus.${id}.${field} must be a non-empty string`
        );
        assert.ok(entry[field].length > 0, `${ns}.connectionStatus.${id}.${field} empty`);
      }
    }
  }

  // apikey invalid key must not instruct OAuth re-auth in EN catalog
  const apikeyDetail = en.usage.connectionStatus.apikey_invalid_key.detail as string;
  assert.doesNotMatch(apikeyDetail, OAUTH_SUFFIX);
  assert.doesNotMatch(en.usage.connectionStatus.apikey_invalid_key.cta, /re-?authenticat/i);
});

test("ProviderLimits source no longer hard-codes OAuth re-auth suffix", () => {
  const src = readFileSync(
    path.join(
      ROOT,
      "src/app/(dashboard)/dashboard/usage/components/ProviderLimits/index.tsx"
    ),
    "utf8"
  );
  assert.doesNotMatch(
    src,
    /re-authenticate this account/,
    "hard-coded OAuth suffix must be removed from ProviderLimits"
  );
  assert.match(src, /formatQuotaAuthErrorMessage/, "must use auth-mode-aware helper");
});
