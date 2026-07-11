/**
 * F-06-003 / F-06-W2-001: Cloud sync fail-closed signature + outbound secret scrub.
 */
import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  sanitizeProviderConnectionForSync,
  sanitizeApiKeyForSync,
} from "../../src/lib/sync/bundle.ts";

const ORIGINAL_SECRET = process.env.OMNIROUTE_CLOUD_SYNC_SECRET;
const ORIGINAL_INSECURE = process.env.OMNIROUTE_CLOUD_SYNC_INSECURE;

function restoreEnv() {
  if (ORIGINAL_SECRET === undefined) delete process.env.OMNIROUTE_CLOUD_SYNC_SECRET;
  else process.env.OMNIROUTE_CLOUD_SYNC_SECRET = ORIGINAL_SECRET;
  if (ORIGINAL_INSECURE === undefined) delete process.env.OMNIROUTE_CLOUD_SYNC_INSECURE;
  else process.env.OMNIROUTE_CLOUD_SYNC_INSECURE = ORIGINAL_INSECURE;
}

describe("cloud sync signature fail-closed (F-06-003)", () => {
  afterEach(restoreEnv);

  it("rejects when secret is unset (default fail-closed)", async () => {
    delete process.env.OMNIROUTE_CLOUD_SYNC_SECRET;
    delete process.env.OMNIROUTE_CLOUD_SYNC_INSECURE;
    const mod = await import(
      `../../src/lib/cloudSync.ts?t=${Date.now()}-${Math.random()}`
    );
    assert.equal(mod.verifyCloudSignature("{}", null), false);
  });

  it("accepts unsigned only with OMNIROUTE_CLOUD_SYNC_INSECURE=1", async () => {
    delete process.env.OMNIROUTE_CLOUD_SYNC_SECRET;
    process.env.OMNIROUTE_CLOUD_SYNC_INSECURE = "1";
    const mod = await import(
      `../../src/lib/cloudSync.ts?t=${Date.now()}-${Math.random()}`
    );
    assert.equal(mod.verifyCloudSignature("{}", null), true);
  });

  it("accepts valid HMAC when secret is set", async () => {
    const secret = crypto.createHash("sha256").update("omniroute-test-0046").digest("hex");
    process.env.OMNIROUTE_CLOUD_SYNC_SECRET = secret;
    delete process.env.OMNIROUTE_CLOUD_SYNC_INSECURE;
    const mod = await import(
      `../../src/lib/cloudSync.ts?t=${Date.now()}-${Math.random()}`
    );
    const body = JSON.stringify({ ok: true });
    const sig = crypto.createHmac("sha256", secret).update(body).digest("hex");
    assert.equal(mod.verifyCloudSignature(body, sig), true);
    assert.equal(mod.verifyCloudSignature(body, null), false);
    assert.equal(mod.verifyCloudSignature(body, "0".repeat(64)), false);
  });
});

describe("cloud sync outbound scrub (F-06-W2-001)", () => {
  it("redacts oauth tokens and api keys by default", () => {
    const connection = sanitizeProviderConnectionForSync({
      id: "c1",
      provider: "openai",
      name: "main",
      accessToken: "at-secret",
      refreshToken: "rt-secret",
      idToken: "id-secret",
      apiKey: "sk-secret",
      providerSpecificData: { cookie: "session=abc" },
      expiresAt: "2026-01-01T00:00:00.000Z",
      isActive: true,
    });

    assert.equal(connection.id, "c1");
    assert.equal(connection.provider, "openai");
    assert.equal(connection.expiresAt, "2026-01-01T00:00:00.000Z");
    assert.equal(connection.accessToken, undefined);
    assert.equal(connection.refreshToken, undefined);
    assert.equal(connection.idToken, undefined);
    assert.equal(connection.apiKey, undefined);
    assert.equal(connection.providerSpecificData, undefined);

    const apiKey = sanitizeApiKeyForSync({
      id: "k1",
      name: "ops",
      key: "omni-plaintext-key",
      isActive: true,
    });
    assert.equal(apiKey.id, "k1");
    assert.equal(apiKey.name, "ops");
    assert.equal(apiKey.key, undefined);
  });

  it("includes secrets only when includeSecrets=true", () => {
    const connection = sanitizeProviderConnectionForSync(
      {
        id: "c1",
        provider: "openai",
        accessToken: "at-secret",
        refreshToken: "rt-secret",
        apiKey: "sk-secret",
      },
      { includeSecrets: true }
    );
    assert.equal(connection.accessToken, "at-secret");
    assert.equal(connection.refreshToken, "rt-secret");
    assert.equal(connection.apiKey, "sk-secret");

    const apiKey = sanitizeApiKeyForSync(
      { id: "k1", name: "ops", key: "omni-plaintext-key" },
      { includeSecrets: true }
    );
    assert.equal(apiKey.key, "omni-plaintext-key");
  });

  it("snapshot: default sanitized connection has no credential fields", () => {
    const scrubbed = sanitizeProviderConnectionForSync({
      id: "snap-1",
      provider: "anthropic",
      authType: "oauth",
      name: "claude",
      accessToken: "LEAK_ME",
      refreshToken: "LEAK_ME_TOO",
      apiKey: "LEAK_KEY",
      idToken: "LEAK_ID",
      providerSpecificData: { refresh: "LEAK_PSD" },
      expiresAt: "2030-01-01T00:00:00.000Z",
      isActive: true,
      group: "default",
    });
    assert.deepEqual(scrubbed, {
      id: "snap-1",
      provider: "anthropic",
      authType: "oauth",
      name: "claude",
      expiresAt: "2030-01-01T00:00:00.000Z",
      isActive: true,
      group: "default",
    });
  });
});
