import test from "node:test";
import assert from "node:assert/strict";
import {
  parseConfiguredOnlyPreference,
  parseProviderDisplayModePreference,
  readConfiguredOnlyPreference,
  writeConfiguredOnlyPreference,
  readProviderDisplayModePreference,
  shouldSyncProviderDisplayMode,
  writeProviderDisplayModePreference,
  SHOW_CONFIGURED_ONLY_STORAGE_KEY,
  PROVIDER_DISPLAY_MODE_STORAGE_KEY,
} from "../../../src/app/(dashboard)/dashboard/providers/providerPageStorage";

// ---------------------------------------------------------------------------
// Helpers: in-memory storage mock
// ---------------------------------------------------------------------------
function makeMockStorage(): {
  store: Map<string, string>;
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
} {
  const store = new Map<string, string>();
  return {
    store,
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

// ---------------------------------------------------------------------------
// parseConfiguredOnlyPreference
// ---------------------------------------------------------------------------
test("parseConfiguredOnlyPreference returns true for 'true'", () => {
  assert.equal(parseConfiguredOnlyPreference("true"), true);
});

test("parseConfiguredOnlyPreference returns false for 'false'", () => {
  assert.equal(parseConfiguredOnlyPreference("false"), false);
});

test("parseConfiguredOnlyPreference returns false for null", () => {
  assert.equal(parseConfiguredOnlyPreference(null), false);
});

test("parseConfiguredOnlyPreference returns false for undefined", () => {
  assert.equal(parseConfiguredOnlyPreference(undefined), false);
});

test("parseConfiguredOnlyPreference returns false for empty string", () => {
  assert.equal(parseConfiguredOnlyPreference(""), false);
});

// ---------------------------------------------------------------------------
// parseProviderDisplayModePreference — grid/list + legacy migration
// ---------------------------------------------------------------------------
test("parseProviderDisplayModePreference returns 'grid' for 'grid'", () => {
  assert.equal(parseProviderDisplayModePreference("grid"), "grid");
});

test("parseProviderDisplayModePreference returns 'list' for 'list'", () => {
  assert.equal(parseProviderDisplayModePreference("list"), "list");
});

test("parseProviderDisplayModePreference migrates 'all' → 'grid'", () => {
  assert.equal(parseProviderDisplayModePreference("all"), "grid");
});

test("parseProviderDisplayModePreference migrates 'configured' → 'grid'", () => {
  assert.equal(parseProviderDisplayModePreference("configured"), "grid");
});

test("parseProviderDisplayModePreference migrates 'compact' → 'list'", () => {
  assert.equal(parseProviderDisplayModePreference("compact"), "list");
});

test("parseProviderDisplayModePreference returns null for invalid value", () => {
  assert.equal(parseProviderDisplayModePreference("unknown"), null);
});

test("parseProviderDisplayModePreference returns null for null", () => {
  assert.equal(parseProviderDisplayModePreference(null), null);
});

test("parseProviderDisplayModePreference returns null for undefined", () => {
  assert.equal(parseProviderDisplayModePreference(undefined), null);
});

// ---------------------------------------------------------------------------
// readConfiguredOnlyPreference
// ---------------------------------------------------------------------------
test("readConfiguredOnlyPreference returns false when storage is null", () => {
  assert.equal(readConfiguredOnlyPreference(null), false);
});

test("readConfiguredOnlyPreference reads value from storage", () => {
  const storage = makeMockStorage();
  storage.setItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY, "true");
  assert.equal(readConfiguredOnlyPreference(storage), true);
});

test("readConfiguredOnlyPreference returns false when key is missing", () => {
  const storage = makeMockStorage();
  assert.equal(readConfiguredOnlyPreference(storage), false);
});

// ---------------------------------------------------------------------------
// writeConfiguredOnlyPreference
// ---------------------------------------------------------------------------
test("writeConfiguredOnlyPreference does nothing when storage is null", () => {
  // Should not throw
  writeConfiguredOnlyPreference(true, null);
});

test("writeConfiguredOnlyPreference sets key to 'true' when enabled", () => {
  const storage = makeMockStorage();
  writeConfiguredOnlyPreference(true, storage);
  assert.equal(storage.getItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY), "true");
});

test("writeConfiguredOnlyPreference removes key when disabled", () => {
  const storage = makeMockStorage();
  storage.setItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY, "true");
  writeConfiguredOnlyPreference(false, storage);
  assert.equal(storage.getItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY), null);
});

// ---------------------------------------------------------------------------
// readProviderDisplayModePreference (the main function used by the page)
// ---------------------------------------------------------------------------
test("readProviderDisplayModePreference returns 'grid' when storage is null", () => {
  assert.equal(readProviderDisplayModePreference(null), "grid");
});

test("readProviderDisplayModePreference reads stored grid mode", () => {
  const storage = makeMockStorage();
  storage.setItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY, "grid");
  assert.equal(readProviderDisplayModePreference(storage), "grid");
});

test("readProviderDisplayModePreference reads stored list mode", () => {
  const storage = makeMockStorage();
  storage.setItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY, "list");
  assert.equal(readProviderDisplayModePreference(storage), "list");
});

test("readProviderDisplayModePreference returns 'grid' when no preference stored", () => {
  const storage = makeMockStorage();
  assert.equal(readProviderDisplayModePreference(storage), "grid");
});

test("readProviderDisplayModePreference migrates from old configured-only key to grid", () => {
  const storage = makeMockStorage();
  // Old key set but new key missing
  storage.setItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY, "true");
  assert.equal(storage.getItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY), null);

  // Configured is now a filter chip — display mode defaults to grid,
  // but the old filter intent is preserved on the independent key.
  const result = readProviderDisplayModePreference(storage);
  assert.equal(result, "grid");
  assert.equal(storage.getItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY), "grid");
  assert.equal(
    storage.getItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY),
    "true",
    "old configured-only intent must survive migration as an independent filter"
  );
});

test("readProviderDisplayModePreference with legacy 'configured' display mode preserves filter intent", () => {
  const storage = makeMockStorage();
  // A browser that still has the old display mode stored as "configured".
  // Before the task this presented "Configured" as a UI segment.
  storage.setItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY, "configured");
  assert.equal(storage.getItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY), null);

  const result = readProviderDisplayModePreference(storage);
  assert.equal(result, "grid", 'legacy "configured" display mode → grid');
  assert.equal(
    storage.getItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY),
    "grid",
    "migrated value must persist"
  );
  assert.equal(
    storage.getItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY),
    "true",
    "configured-only filter must be enabled to preserve old intent"
  );
});

test("readProviderDisplayModePreference migrates legacy compact → list", () => {
  const storage = makeMockStorage();
  storage.setItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY, "compact");
  assert.equal(readProviderDisplayModePreference(storage), "list");
});

test("readProviderDisplayModePreference migrates legacy all → grid", () => {
  const storage = makeMockStorage();
  storage.setItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY, "all");
  assert.equal(readProviderDisplayModePreference(storage), "grid");
});

test("readProviderDisplayModePreference migrates legacy configured → grid", () => {
  const storage = makeMockStorage();
  storage.setItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY, "configured");
  assert.equal(readProviderDisplayModePreference(storage), "grid");
});

// ---------------------------------------------------------------------------
// writeProviderDisplayModePreference
// ---------------------------------------------------------------------------
test("writeProviderDisplayModePreference does nothing when storage is null", () => {
  writeProviderDisplayModePreference("list", null);
});

test("writeProviderDisplayModePreference stores 'list' and preserves configured-only filter", () => {
  const storage = makeMockStorage();
  storage.setItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY, "true");

  writeProviderDisplayModePreference("list", storage);
  assert.equal(storage.getItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY), "list");
  assert.equal(
    storage.getItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY),
    "true",
    "configured-only filter intent must survive display-mode writes"
  );
});

test("writeProviderDisplayModePreference with 'grid' removes the mode key but preserves the configured-only filter", () => {
  const storage = makeMockStorage();
  storage.setItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY, "list");
  storage.setItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY, "true");

  writeProviderDisplayModePreference("grid", storage);
  assert.equal(storage.getItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY), null);
  assert.equal(
    storage.getItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY),
    "true",
    "configured-only filter must be independently persisted"
  );
});

// ---------------------------------------------------------------------------
// shouldSyncProviderDisplayMode — race guard (#5510)
// The persistence effects must stay inert while the connections fetch is still
// loading; otherwise an empty connections list coerces a saved "configured"
// preference to "all" and the filter is lost across reloads.
// ---------------------------------------------------------------------------

test("shouldSyncProviderDisplayMode blocks the effects while loading (#5510 race guard)", () => {
  // The bug: without the loading check, the effect runs against connections.length === 0
  // mid-fetch and overwrites the saved preference. This is the failing-without-fix case.
  assert.equal(shouldSyncProviderDisplayMode(true, true), false);
});

test("shouldSyncProviderDisplayMode stays inert until the stored preference is read", () => {
  assert.equal(shouldSyncProviderDisplayMode(false, false), false);
  assert.equal(shouldSyncProviderDisplayMode(false, true), false);
});

test("shouldSyncProviderDisplayMode allows persistence once ready and settled", () => {
  assert.equal(shouldSyncProviderDisplayMode(true, false), true);
});
