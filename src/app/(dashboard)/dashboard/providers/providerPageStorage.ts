export const SHOW_CONFIGURED_ONLY_STORAGE_KEY = "omniroute-providers-show-configured-only";
export const PROVIDER_DISPLAY_MODE_STORAGE_KEY = "omniroute-providers-display-mode";

export type ProviderDisplayMode = "all" | "configured" | "compact" | "grid" | "list";

interface StorageReader {
  getItem(key: string): string | null;
}

interface StorageWriter extends StorageReader {
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

type StorageReaderWriter = StorageReader & Partial<StorageWriter>;

export function parseConfiguredOnlyPreference(value: string | null | undefined): boolean {
  return value === "true";
}

export function parseProviderDisplayModePreference(
  value: string | null | undefined
): ProviderDisplayMode | null {
  // New canonical values
  if (value === "grid" || value === "list") return value;

  // Legacy migration: old "all" → "grid", old "configured" → "grid" (it is a filter now),
  // old "compact" → "list"
  if (value === "all") return "grid";
  if (value === "configured") return "grid";
  if (value === "compact") return "list";

  return null;
}

function getBrowserStorage(): StorageWriter | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readConfiguredOnlyPreference(storage: StorageReader | null = getBrowserStorage()) {
  if (!storage) return false;

  return parseConfiguredOnlyPreference(storage.getItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY));
}

export function writeConfiguredOnlyPreference(
  enabled: boolean,
  storage: StorageWriter | null = getBrowserStorage()
) {
  if (!storage) return;

  if (enabled) {
    storage.setItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY, "true");
    return;
  }

  storage.removeItem(SHOW_CONFIGURED_ONLY_STORAGE_KEY);
}

export function readProviderDisplayModePreference(
  storage: StorageReaderWriter | null = getBrowserStorage()
): ProviderDisplayMode {
  if (!storage) return "grid";

  const rawMode = storage.getItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY);
  const storedMode = parseProviderDisplayModePreference(rawMode);
  if (storedMode) {
    if (rawMode === "configured") {
      storage.setItem?.(SHOW_CONFIGURED_ONLY_STORAGE_KEY, "true");
    }
    if (rawMode === "all" || rawMode === "configured") {
      storage.setItem?.(PROVIDER_DISPLAY_MODE_STORAGE_KEY, "grid");
    }
    if (rawMode === "compact") {
      storage.setItem?.(PROVIDER_DISPLAY_MODE_STORAGE_KEY, "list");
    }
    return storedMode;
  }

  if (!readConfiguredOnlyPreference(storage)) return "grid";

  storage.setItem?.(PROVIDER_DISPLAY_MODE_STORAGE_KEY, "grid");
  return "grid";
}

export function writeProviderDisplayModePreference(
  mode: ProviderDisplayMode,
  storage: StorageWriter | null = getBrowserStorage()
) {
  if (!storage) return;

  // NOTE: the configured-only key is owned by the independent "Configured"
  // filter chip now — display-mode writes must not clear it.
  if (mode === "grid") {
    storage.removeItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY);
    return;
  }

  storage.setItem(PROVIDER_DISPLAY_MODE_STORAGE_KEY, mode);
}

/**
 * Gate for the provider display-mode persistence effects. They must NOT run while the
 * connections fetch is still in flight (`loading`), or they would coerce a saved
 * "configured" preference to "all" against an empty connections list before the real
 * data arrives — silently dropping the user's filter across reloads (#5510). Returns
 * true only once the stored preference has been read (`ready`) AND loading has settled.
 */
export function shouldSyncProviderDisplayMode(ready: boolean, loading: boolean): boolean {
  return ready && !loading;
}
