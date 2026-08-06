// Settings — oauthAutoOpen (Task 0135)
//
// Validates the new `oauthAutoOpen` boolean against the persisted settings
// store: default true on a fresh deployment, persisted across reads, settable
// to false via updateSettings, and accepted by the Zod PATCH schema.

import { describe, test, beforeEach, afterEach, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

async function createSettingsHarness() {
  const testDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-0135-settings-"));
  process.env.DATA_DIR = testDataDir;
  process.env.REQUIRE_API_KEY = "false";
  if (!process.env.API_KEY_SECRET) {
    process.env.API_KEY_SECRET = "test-0135-secret-" + Date.now();
  }

  const core = await import("../../src/lib/db/core.ts");
  const { getSettings, updateSettings } = await import("../../src/lib/db/settings.ts");
  const { updateSettingsSchema } = await import(
    "../../src/shared/validation/settingsSchemas.ts"
  );

  async function resetStorage() {
    core.resetDbInstance();
    fs.rmSync(testDataDir, { recursive: true, force: true });
    fs.mkdirSync(testDataDir, { recursive: true });
  }

  function cleanup() {
    core.resetDbInstance();
    fs.rmSync(testDataDir, { recursive: true, force: true });
  }

  return {
    testDataDir,
    core,
    getSettings,
    updateSettings,
    updateSettingsSchema,
    resetStorage,
    cleanup,
  };
}

const harness = await createSettingsHarness();

beforeEach(async () => {
  await harness.resetStorage();
});

afterEach(async () => {
  await harness.resetStorage();
});

after(() => {
  harness.cleanup();
});

describe("Settings — oauthAutoOpen (Task 0135)", () => {
  test("default is true on a fresh deployment (preserves current popup behavior)", async () => {
    const settings = await harness.getSettings();
    assert.strictEqual(
      settings.oauthAutoOpen,
      true,
      "oauthAutoOpen should default to true so existing operators keep their popup workflow"
    );
  });

  test("updateSettings({ oauthAutoOpen: false }) persists and survives reload", async () => {
    await harness.updateSettings({ oauthAutoOpen: false });

    const settings = await harness.getSettings();
    assert.strictEqual(
      settings.oauthAutoOpen,
      false,
      "oauthAutoOpen=false must round-trip through the KV store"
    );

    // Force a DB re-read by busting the singleton — getSettings() reads from
    // the in-memory cache until invalidated, so we simulate a fresh process.
    harness.core.resetDbInstance();
    const reloaded = await harness.getSettings();
    assert.strictEqual(
      reloaded.oauthAutoOpen,
      false,
      "oauthAutoOpen must persist across a process restart (KV read)"
    );
  });

  test("updateSettings({ oauthAutoOpen: true }) restores the default after false", async () => {
    await harness.updateSettings({ oauthAutoOpen: false });
    await harness.updateSettings({ oauthAutoOpen: true });
    const settings = await harness.getSettings();
    assert.strictEqual(settings.oauthAutoOpen, true);
  });

  test("Zod PATCH schema accepts oauthAutoOpen as a boolean", () => {
    const accepted = harness.updateSettingsSchema.safeParse({ oauthAutoOpen: false });
    assert.ok(accepted.success, "schema must accept oauthAutoOpen: boolean");

    const rejected = harness.updateSettingsSchema.safeParse({ oauthAutoOpen: "not-a-bool" });
    assert.ok(
      !rejected.success,
      "schema must reject oauthAutoOpen with a non-boolean value"
    );
  });

  test("Zod PATCH schema accepts oauthAutoOpen as optional", () => {
    const accepted = harness.updateSettingsSchema.safeParse({ theme: "dark" });
    assert.ok(accepted.success, "schema must allow omitting oauthAutoOpen");
  });
});