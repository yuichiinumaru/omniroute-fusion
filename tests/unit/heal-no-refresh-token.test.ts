/**
 * Heal false-positive apikey `no_refresh_token` rows (Epic 0006 / Task 0034)
 *
 * Operator verification SQL (post-heal on fixed code):
 *   SELECT auth_type, provider, COUNT(*) FROM provider_connections
 *   WHERE error_code='no_refresh_token' GROUP BY 1,2;
 * Expected: 0 rows with auth_type='apikey' AND error_code='no_refresh_token'
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.NODE_ENV = "test";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-heal-no-rt-"));
process.env.DATA_DIR = TEST_DATA_DIR;

const core = await import("../../src/lib/db/core.ts");
const providersDb = await import("../../src/lib/db/providers.ts");
const healMod = await import("../../src/lib/db/healFalsePositiveNoRefresh.ts");

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

async function seedFalsePositiveApikey(opts: {
  provider: string;
  name: string;
  apiKey: string;
}) {
  const created = (await providersDb.createProviderConnection({
    provider: opts.provider,
    authType: "apikey",
    name: opts.name,
    apiKey: opts.apiKey,
    refreshToken: null,
    testStatus: "active",
    isActive: true,
  })) as { id: string };

  await providersDb.updateProviderConnection(created.id, {
    testStatus: "expired",
    lastError: "No refresh token available — re-authenticate this account.",
    lastErrorAt: new Date().toISOString(),
    lastErrorType: "no_refresh_token",
    lastErrorSource: "oauth",
    errorCode: "no_refresh_token",
  });

  return created.id;
}

test("heal restores gemini apikey false-positive no_refresh_token → active + clear errors", async () => {
  await resetStorage();
  const id = await seedFalsePositiveApikey({
    provider: "gemini",
    name: "Heal Gemini Studio",
    apiKey: "AQ.heal-gemini-key",
  });

  const before = await providersDb.getProviderConnectionById(id);
  assert.equal(before?.testStatus, "expired");
  assert.equal(before?.errorCode, "no_refresh_token");

  const result = await healMod.healFalsePositiveNoRefreshConnections();
  assert.equal(result.healed, 1);
  assert.deepEqual(result.healedIds, [id]);

  const after = await providersDb.getProviderConnectionById(id);
  assert.equal(after?.testStatus, "active");
  assert.equal(after?.errorCode ?? null, null);
  assert.equal(after?.lastError ?? null, null);
  assert.equal(after?.lastErrorType ?? null, null);
  assert.equal(after?.lastErrorSource ?? null, null);
  assert.equal(after?.lastErrorAt ?? null, null);
});

test("heal restores qoder apikey false-positive no_refresh_token", async () => {
  await resetStorage();
  const id = await seedFalsePositiveApikey({
    provider: "qoder",
    name: "Heal Qoder PAT",
    apiKey: "qoder-heal-pat-key",
  });

  const result = await healMod.healFalsePositiveNoRefreshConnections();
  assert.equal(result.healed, 1);

  const after = await providersDb.getProviderConnectionById(id);
  assert.equal(after?.testStatus, "active");
  assert.notEqual(after?.errorCode, "no_refresh_token");
});

test("heal does NOT touch oauth no_refresh_token (#5326 legitimate)", async () => {
  await resetStorage();
  const created = (await providersDb.createProviderConnection({
    provider: "github",
    authType: "oauth",
    name: "Heal OAuth Keep",
    email: "oauth-keep@example.com",
    accessToken: "access-only",
    refreshToken: null,
    testStatus: "active",
    isActive: true,
  })) as { id: string };

  await providersDb.updateProviderConnection(created.id, {
    testStatus: "expired",
    lastError: "No refresh token available — re-authenticate this account.",
    lastErrorAt: new Date().toISOString(),
    lastErrorType: "no_refresh_token",
    lastErrorSource: "oauth",
    errorCode: "no_refresh_token",
  });

  const result = await healMod.healFalsePositiveNoRefreshConnections();
  assert.equal(result.healed, 0);

  const after = await providersDb.getProviderConnectionById(created.id);
  assert.equal(after?.testStatus, "expired");
  assert.equal(after?.errorCode, "no_refresh_token");
});

test("heal does NOT clear unrelated error codes (banned / refresh_failed)", async () => {
  await resetStorage();
  const banned = (await providersDb.createProviderConnection({
    provider: "gemini",
    authType: "apikey",
    name: "Banned Key",
    apiKey: "AQ.banned-key",
    testStatus: "active",
    isActive: true,
  })) as { id: string };
  await providersDb.updateProviderConnection(banned.id, {
    testStatus: "banned",
    errorCode: "banned",
    lastErrorType: "banned",
    lastError: "Account banned",
  });

  const failed = (await providersDb.createProviderConnection({
    provider: "qoder",
    authType: "apikey",
    name: "Refresh Failed Key",
    apiKey: "qoder-refresh-failed",
    testStatus: "active",
    isActive: true,
  })) as { id: string };
  await providersDb.updateProviderConnection(failed.id, {
    testStatus: "expired",
    errorCode: "refresh_failed",
    lastErrorType: "refresh_failed",
    lastError: "upstream refresh failed",
  });

  const result = await healMod.healFalsePositiveNoRefreshConnections();
  assert.equal(result.healed, 0);

  const bannedAfter = await providersDb.getProviderConnectionById(banned.id);
  assert.equal(bannedAfter?.testStatus, "banned");
  assert.equal(bannedAfter?.errorCode, "banned");

  const failedAfter = await providersDb.getProviderConnectionById(failed.id);
  assert.equal(failedAfter?.errorCode, "refresh_failed");
});

test("heal is idempotent — second run heals 0", async () => {
  await resetStorage();
  await seedFalsePositiveApikey({
    provider: "gemini",
    name: "Idempotent Heal",
    apiKey: "AQ.idempotent-heal",
  });

  const first = await healMod.healFalsePositiveNoRefreshConnections();
  assert.equal(first.healed, 1);

  const second = await healMod.healFalsePositiveNoRefreshConnections();
  assert.equal(second.healed, 0);
  assert.deepEqual(second.healedIds, []);
});

test("heal mixed: apikey false-positive healed, oauth kept", async () => {
  await resetStorage();
  const apikeyId = await seedFalsePositiveApikey({
    provider: "gemini",
    name: "Mixed Apikey",
    apiKey: "AQ.mixed-apikey",
  });
  const oauth = (await providersDb.createProviderConnection({
    provider: "antigravity",
    authType: "oauth",
    name: "Mixed OAuth",
    email: "mixed-oauth@example.com",
    accessToken: "a",
    refreshToken: null,
    testStatus: "active",
    isActive: true,
  })) as { id: string };
  await providersDb.updateProviderConnection(oauth.id, {
    testStatus: "expired",
    errorCode: "no_refresh_token",
    lastErrorType: "no_refresh_token",
    lastError: "No refresh token available — re-authenticate this account.",
  });

  const result = await healMod.healFalsePositiveNoRefreshConnections();
  assert.equal(result.healed, 1);
  assert.deepEqual(result.healedIds, [apikeyId]);

  const apikeyAfter = await providersDb.getProviderConnectionById(apikeyId);
  assert.equal(apikeyAfter?.testStatus, "active");

  const oauthAfter = await providersDb.getProviderConnectionById(oauth.id);
  assert.equal(oauthAfter?.testStatus, "expired");
  assert.equal(oauthAfter?.errorCode, "no_refresh_token");
});
