/**
 * Settings hub PageTabBar SSoT (Tasks 0054 + 0061).
 * Direct-route tabs under `/dashboard/settings/{value}` — not `?tab=` (legacy hub redirects).
 *
 * Appearance route stays `/settings/appearance`; tab label is **Interface**
 * (theme/branding UI removed in Task 0053 — remaining prefs are functional only).
 */

/** Ordered Settings PageTabBar options (10 tabs). Pricing is excluded (redirects to costs). */
export const SETTINGS_TABS = [
  { value: "general", label: "Data & Storage", icon: "tune" },
  { value: "appearance", label: "Interface", icon: "display_settings" },
  { value: "ai", label: "AI", icon: "auto_awesome" },
  { value: "routing", label: "Routing", icon: "route" },
  { value: "resilience", label: "Resilience", icon: "health_and_safety" },
  { value: "security", label: "Security", icon: "shield" },
  { value: "access-tokens", label: "Access Tokens", icon: "key" },
  { value: "feature-flags", label: "Feature Flags", icon: "flag" },
  { value: "advanced", label: "Advanced", icon: "engineering" },
  { value: "sidebar", label: "Sidebar", icon: "view_sidebar" },
] as const;

/** One Settings hub tab descriptor (literal value/label/icon). */
export type SettingsHubTab = (typeof SETTINGS_TABS)[number];

/** Discriminated tab path segment / PageTabBar value. */
export type SettingsTabValue = SettingsHubTab["value"];

export const SETTINGS_TAB_VALUES: readonly SettingsTabValue[] = SETTINGS_TABS.map(
  (t) => t.value
);

/** O(1) membership for parse-don't-validate at navigation boundaries. */
const SETTINGS_TAB_VALUE_SET: ReadonlySet<string> = new Set(SETTINGS_TAB_VALUES);

export const SETTINGS_HUB_BASE = "/dashboard/settings" as const;

/** Type guard: narrow unknown path segments / tab clicks to SettingsTabValue. */
export function isSettingsTabValue(value: string): value is SettingsTabValue {
  return SETTINGS_TAB_VALUE_SET.has(value);
}

/** Build absolute dashboard path for a settings tab value. */
export function buildSettingsPath(tabValue: SettingsTabValue): `${typeof SETTINGS_HUB_BASE}/${SettingsTabValue}` {
  return `${SETTINGS_HUB_BASE}/${tabValue}`;
}

/**
 * Map a pathname to the active Settings tab value.
 * Unknown last segments (including bare `/dashboard/settings`) fall back to `general`.
 */
export function pathToTabValue(pathname: string): SettingsTabValue {
  const segments = pathname.split("/").filter(Boolean);
  const last = segments[segments.length - 1] ?? "general";
  return isSettingsTabValue(last) ? last : "general";
}
