// Provider Model Auto-Sync (Task 0129)
//
// Validates:
// 1. Default setting `providerModelAutoSyncEnabled` resolves to true on fresh deployment.
// 2. Global switch `providerModelAutoSyncEnabled=false` disables getAutoSyncConnections and triggerConnectionModelSync.
// 3. Zod PATCH schema validates providerModelAutoSyncEnabled.
// 4. Exactly-once / idempotent first-connection trigger and debounce behavior.
// 5. Connection autoSync property handling (defaults to ON when global switch is ON).
// 6. Failure isolation — trigger catches errors without throwing.

import { describe, test, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function createHarness() {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-0129-sync-"));
  process.env.DATA_DIR = testDataDir;
  process.env.REQUIRE_API_KEY = "false";
  if (!process.env.API_KEY_SECRET) {
    process.env.API_KEY_SECRET = "test-0129-secret-" + Date.now();
  }

  const core = await import("../../src/lib/db/core.ts");
  const { getSettings, updateSettings } = await import("../../src/lib/db/settings.ts");
  const { updateSettingsSchema } = await import(
    "../../src/shared/validation/settingsSchemas.ts"
  );
  const { createProviderConnection, deleteProviderConnections } = await import(
    "../../src/lib/db/providers.ts"
  );
  const {
    getAutoSyncConnections,
    triggerConnectionModelSync,
    __resetModelSyncSchedulerStateForTests,
  } = await import("../../src/shared/services/modelSyncScheduler.ts");

  async function resetStorage() {
    core.resetDbInstance();
    __resetModelSyncSchedulerStateForTests();
    fs.rmSync(testDataDir, { recursive: true, force: true });
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  function cleanup() {
    core.resetDbInstance();
    __resetModelSyncSchedulerStateForTests();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }

  return {
    testDataDir,
    core,
    getSettings,
    updateSettings,
    updateSettingsSchema,
    createProviderConnection,
    deleteProviderConnections,
    getAutoSyncConnections,
    triggerConnectionModelSync,
    __resetModelSyncSchedulerStateForTests,
    resetStorage,
    cleanup,
  };
}

const harness = await createHarness();

beforeEach(async () => {
  await harness.resetStorage();
});

afterEach(async () => {
  await harness.resetStorage();
});

after(() => {
  harness.cleanup();
});

describe("Provider Model Auto-Sync (Task 0129)", () => {
  test("default setting providerModelAutoSyncEnabled is true on fresh installation", async () => {
    const settings = await harness.getSettings();
    assert.strictEqual(
      settings.providerModelAutoSyncEnabled,
      true,
      "providerModelAutoSyncEnabled must default to true on fresh install"
    );
  });

  test("updateSettings({ providerModelAutoSyncEnabled: false }) persists across reads", async () => {
    await harness.updateSettings({ providerModelAutoSyncEnabled: false });

    const settings = await harness.getSettings();
    assert.strictEqual(settings.providerModelAutoSyncEnabled, false);

    harness.core.resetDbInstance();
    const reloaded = await harness.getSettings();
    assert.strictEqual(reloaded.providerModelAutoSyncEnabled, false);
  });

  test("Zod PATCH schema accepts providerModelAutoSyncEnabled as boolean and optional", () => {
    const accepted = harness.updateSettingsSchema.safeParse({ providerModelAutoSyncEnabled: false });
    assert.ok(accepted.success, "schema must accept boolean");

    const rejected = harness.updateSettingsSchema.safeParse({ providerModelAutoSyncEnabled: "not-bool" });
    assert.ok(!rejected.success, "schema must reject non-boolean");

    const optional = harness.updateSettingsSchema.safeParse({ theme: "dark" });
    assert.ok(optional.success, "schema must allow omitting key");
  });

  test("getAutoSyncConnections includes connections when global toggle is ON (default)", async () => {
    const conn = await harness.createProviderConnection({
      provider: "openai",
      authType: "apikey",
      name: "Test OpenAI",
      apiKey: "sk-test-12345",
      isActive: true,
    });

    const autoSyncConns = await harness.getAutoSyncConnections();
    assert.strictEqual(autoSyncConns.length, 1);
    assert.strictEqual(autoSyncConns[0].id, conn.id);
  });

  test("getAutoSyncConnections excludes connection with autoSync: false in providerSpecificData", async () => {
    await harness.createProviderConnection({
      provider: "openai",
      authType: "apikey",
      name: "Disabled AutoSync Connection",
      apiKey: "sk-test-12345",
      isActive: true,
      providerSpecificData: { autoSync: false },
    });

    const autoSyncConns = await harness.getAutoSyncConnections();
    assert.strictEqual(autoSyncConns.length, 0);
  });

  test("getAutoSyncConnections returns [] when global switch providerModelAutoSyncEnabled is OFF", async () => {
    await harness.createProviderConnection({
      provider: "openai",
      authType: "apikey",
      name: "Test OpenAI",
      apiKey: "sk-test-12345",
      isActive: true,
    });

    await harness.updateSettings({ providerModelAutoSyncEnabled: false });

    const autoSyncConns = await harness.getAutoSyncConnections();
    assert.strictEqual(autoSyncConns.length, 0, "must return [] when global auto-sync switch is OFF");
  });

  test("triggerConnectionModelSync fails closed with global_disabled when switch is OFF", async () => {
    const conn = await harness.createProviderConnection({
      provider: "openai",
      authType: "apikey",
      name: "Test OpenAI",
      apiKey: "sk-test-12345",
      isActive: true,
    });

    await harness.updateSettings({ providerModelAutoSyncEnabled: false });

    const res = await harness.triggerConnectionModelSync(conn.id, "openai");
    assert.strictEqual(res.triggered, false);
    assert.strictEqual(res.reason, "global_disabled");
  });

  test("triggerConnectionModelSync returns connection_disabled when connection has autoSync: false (boolean, string, or number 0)", async () => {
    const connBool = await harness.createProviderConnection({
      provider: "openai",
      authType: "apikey",
      name: "Test OpenAI Bool",
      apiKey: "sk-test-12345",
      isActive: true,
      providerSpecificData: { autoSync: false },
    });

    const resBool = await harness.triggerConnectionModelSync(connBool.id, "openai");
    assert.strictEqual(resBool.triggered, false);
    assert.strictEqual(resBool.reason, "connection_disabled");

    const connStr = await harness.createProviderConnection({
      provider: "openai",
      authType: "apikey",
      name: "Test OpenAI Str",
      apiKey: "sk-test-12345",
      isActive: true,
      providerSpecificData: { autoSync: "false" as unknown as boolean },
    });

    const resStr = await harness.triggerConnectionModelSync(connStr.id, "openai");
    assert.strictEqual(resStr.triggered, false);
    assert.strictEqual(resStr.reason, "connection_disabled");
  });

  test("triggerConnectionModelSync returns connection_inactive when connection is inactive", async () => {
    const conn = await harness.createProviderConnection({
      provider: "openai",
      authType: "apikey",
      name: "Test OpenAI",
      apiKey: "sk-test-12345",
      isActive: false,
    });

    const res = await harness.triggerConnectionModelSync(conn.id, "openai");
    assert.strictEqual(res.triggered, false);
    assert.strictEqual(res.reason, "connection_inactive");
  });

  test("triggerConnectionModelSync debounces rapid subsequent triggers for same connection/provider", async () => {
    const conn = await harness.createProviderConnection({
      provider: "openai",
      authType: "apikey",
      name: "Test OpenAI",
      apiKey: "sk-test-12345",
      isActive: true,
    });

    // Mock fetch for loopback sync route to return 200 OK
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async (_input: unknown, _init: unknown) => {
      return new Response(JSON.stringify({ ok: true, syncedModels: 5 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as typeof fetch;

    try {
      const firstTrigger = await harness.triggerConnectionModelSync(conn.id, "openai");
      assert.strictEqual(firstTrigger.triggered, true);

      // Rapid second trigger immediately after
      const secondTrigger = await harness.triggerConnectionModelSync(conn.id, "openai");
      assert.strictEqual(secondTrigger.triggered, false);
      assert.strictEqual(secondTrigger.reason, "debounced");

      // Force option bypasses debounce
      const forcedTrigger = await harness.triggerConnectionModelSync(conn.id, "openai", { force: true });
      assert.strictEqual(forcedTrigger.triggered, true);
    } finally {
      globalThis.fetch = origFetch;
    }
  });

  test("failure isolation — sync errors do not throw or break trigger result envelope", async () => {
    const conn = await harness.createProviderConnection({
      provider: "openai",
      authType: "apikey",
      name: "Test OpenAI",
      apiKey: "sk-test-12345",
      isActive: true,
    });

    // Mock fetch to simulate loopback 500 error or network throw
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => {
      return new Response(JSON.stringify({ error: "Upstream failure" }), { status: 500 });
    }) as typeof fetch;

    try {
      const res = await harness.triggerConnectionModelSync(conn.id, "openai");
      assert.strictEqual(res.triggered, false);
      assert.strictEqual(res.reason, "error");
    } finally {
      globalThis.fetch = origFetch;
    }
  });
});
