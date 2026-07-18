/**
 * Dual-mode token health matrix (Epic 0006 / Task 0033)
 *
 * Provider inventory that can appear as both OAuth and static credential
 * (must never get force-expired via no_refresh_token when auth is static):
 *   - gemini (AI Studio apikey vs gemini-cli oauth)
 *   - qoder (PAT apikey vs oauth)
 *   - codebuddy-cn (FREE_APIKEY dual + oauth primary)
 *
 * Plus static-only shapes: cookie, blank/null authType + apiKey.
 * Positive control: oauth + supportsTokenRefresh + no RT → expired (#5326).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.NODE_ENV = "test";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-hc-dual-mode-"));
process.env.DATA_DIR = TEST_DATA_DIR;

const core = await import("../../src/lib/db/core.ts");
const providersDb = await import("../../src/lib/db/providers.ts");
const tokenHealthCheck = await import("../../src/lib/tokenHealthCheck.ts");
const tokenRefresh = await import("../../open-sse/services/tokenRefresh.ts");

async function resetStorage() {
  core.resetDbInstance();
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
      }
      break;
    } catch (error: unknown) {
      const code =
        error && typeof error === "object" && "code" in error
          ? (error as { code?: string }).code
          : undefined;
      if ((code === "EBUSY" || code === "EPERM") && attempt < 9) {
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
      } else {
        throw error;
      }
    }
  }
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

test.after(async () => {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

async function assertStaysActiveNotNoRefresh(connection: { id?: string }) {
  await tokenHealthCheck.checkConnection(connection);
  const updated = await providersDb.getProviderConnectionById(String(connection.id));
  assert.equal(updated?.testStatus, "active");
  assert.notEqual(updated?.errorCode, "no_refresh_token");
  assert.notEqual(updated?.lastErrorType, "no_refresh_token");
}

// ── Static credentials must not receive no_refresh_token ─────────────────────

test("matrix: gemini + apikey + no RT stays active", async () => {
  await resetStorage();
  // Pin: dual-mode negative is only meaningful while provider supports refresh.
  assert.equal(tokenRefresh.supportsTokenRefresh("gemini"), true);
  const connection = await providersDb.createProviderConnection({
    provider: "gemini",
    authType: "apikey",
    name: "Matrix Gemini Studio",
    apiKey: "AQ.matrix-gemini-studio-key",
    refreshToken: null,
    testStatus: "active",
    isActive: true,
  });
  await assertStaysActiveNotNoRefresh(connection as { id?: string });
});

test("matrix: qoder + apikey (PAT) + no RT stays active", async () => {
  await resetStorage();
  assert.equal(tokenRefresh.supportsTokenRefresh("qoder"), true);
  const connection = await providersDb.createProviderConnection({
    provider: "qoder",
    authType: "apikey",
    name: "Matrix Qoder PAT",
    apiKey: "qoder-pat-matrix-fake-key",
    refreshToken: null,
    testStatus: "active",
    isActive: true,
  });
  await assertStaysActiveNotNoRefresh(connection as { id?: string });
});

test("matrix: codebuddy-cn + apikey dual-mode + no RT stays active", async () => {
  await resetStorage();
  assert.equal(tokenRefresh.supportsTokenRefresh("codebuddy-cn"), true);
  const connection = await providersDb.createProviderConnection({
    provider: "codebuddy-cn",
    authType: "apikey",
    name: "Matrix CodeBuddy Free Key",
    apiKey: "codebuddy-cn-matrix-apikey",
    refreshToken: null,
    testStatus: "active",
    isActive: true,
  });
  await assertStaysActiveNotNoRefresh(connection as { id?: string });
});

test("matrix: cookie auth + no RT stays active", async () => {
  await resetStorage();
  // Counterfactual: cookie on a refresh-capable dual-mode provider (not chatgpt-web).
  assert.equal(tokenRefresh.supportsTokenRefresh("gemini"), true);
  const connection = await providersDb.createProviderConnection({
    provider: "gemini",
    authType: "cookie",
    name: "Matrix Cookie on Refresh-Capable Provider",
    refreshToken: null,
    testStatus: "active",
    isActive: true,
    providerSpecificData: { cookie: "session_token=matrix-fake-cookie" },
  });
  await assertStaysActiveNotNoRefresh(connection as { id?: string });
});

test("matrix: blank/null authType + non-empty apiKey stays active", async () => {
  await resetStorage();
  assert.equal(tokenRefresh.supportsTokenRefresh("gemini"), true);
  // createProviderConnection defaults blank authType to "oauth" — inject via update
  // so the sweep sees a legacy blank-ish row with a static key (foot-gun path).
  const connection = (await providersDb.createProviderConnection({
    provider: "gemini",
    authType: "apikey",
    name: "Matrix Blank AuthType",
    apiKey: "AQ.matrix-blank-auth-key",
    refreshToken: null,
    testStatus: "active",
    isActive: true,
  })) as { id: string };

  // Force authType to empty string / null-like for the health gate
  await providersDb.updateProviderConnection(connection.id, {
    authType: "",
  });
  const reloaded = await providersDb.getProviderConnectionById(connection.id);
  assert.ok(reloaded);
  const blankAuth = (reloaded as { authType?: string | null }).authType;
  assert.ok(
    blankAuth === "" || blankAuth === null || blankAuth === undefined,
    `expected blank authType after force-update, got ${JSON.stringify(blankAuth)}`
  );
  // apiKey must still be present after reload
  assert.ok(typeof (reloaded as { apiKey?: string }).apiKey === "string");

  await assertStaysActiveNotNoRefresh(reloaded as { id?: string });
});

test("matrix: blank authType + cookie PSD (no apiKey) stays active", async () => {
  await resetStorage();
  assert.equal(tokenRefresh.supportsTokenRefresh("gemini"), true);
  const connection = (await providersDb.createProviderConnection({
    provider: "gemini",
    authType: "cookie",
    name: "Matrix Blank Cookie PSD",
    refreshToken: null,
    testStatus: "active",
    isActive: true,
    providerSpecificData: { cookie: "session=blank-cookie-psd" },
  })) as { id: string };

  await providersDb.updateProviderConnection(connection.id, { authType: "" });
  const reloaded = await providersDb.getProviderConnectionById(connection.id);
  assert.ok(reloaded);
  const blankAuth = (reloaded as { authType?: string | null }).authType;
  assert.ok(blankAuth === "" || blankAuth === null || blankAuth === undefined);

  await assertStaysActiveNotNoRefresh(reloaded as { id?: string });
});

// ── #5326 positive control ───────────────────────────────────────────────────

test("matrix: oauth + supports refresh + no RT → expired + no_refresh_token (#5326)", async () => {
  await resetStorage();
  const connection = await providersDb.createProviderConnection({
    provider: "antigravity",
    authType: "oauth",
    name: "Matrix OAuth No RT",
    email: "matrix-oauth-no-rt@example.com",
    accessToken: "access-token-only",
    refreshToken: null,
    testStatus: "active",
    isActive: true,
  });

  await tokenHealthCheck.checkConnection(connection);
  const updated = await providersDb.getProviderConnectionById(
    String((connection as { id?: string }).id)
  );
  assert.equal(updated?.testStatus, "expired");
  assert.equal(updated?.errorCode, "no_refresh_token");
  assert.equal(updated?.lastErrorType, "no_refresh_token");
});

// ── Helper SSoT still on health module ───────────────────────────────────────

test("matrix: health module re-exports connectionUsesOAuthRefresh from shared helper", () => {
  assert.equal(typeof tokenHealthCheck.connectionUsesOAuthRefresh, "function");
  assert.equal(
    tokenHealthCheck.connectionUsesOAuthRefresh({
      authType: "apikey",
      apiKey: "k",
    }),
    false
  );
  assert.equal(
    tokenHealthCheck.connectionUsesOAuthRefresh({
      authType: "oauth",
    }),
    true
  );
  assert.equal(
    tokenHealthCheck.connectionUsesOAuthRefresh({
      authType: null,
      apiKey: "static",
    }),
    false
  );
});
