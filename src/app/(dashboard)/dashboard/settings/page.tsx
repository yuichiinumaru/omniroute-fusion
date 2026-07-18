import { redirect } from "next/navigation";
import {
  SETTINGS_HUB_BASE,
  buildSettingsPath,
  type SettingsTabValue,
} from "@/shared/constants/settingsHub";

/**
 * Legacy `?tab=` aliases → first-class settings paths.
 * Canonical values use SettingsTabValue; camelCase aliases retained for old bookmarks.
 */
const LEGACY_TAB_ROUTES = {
  advanced: buildSettingsPath("advanced"),
  ai: buildSettingsPath("ai"),
  appearance: buildSettingsPath("appearance"),
  featureFlags: buildSettingsPath("feature-flags"),
  "feature-flags": buildSettingsPath("feature-flags"),
  general: buildSettingsPath("general"),
  resilience: buildSettingsPath("resilience"),
  routing: buildSettingsPath("routing"),
  security: buildSettingsPath("security"),
  sidebar: buildSettingsPath("sidebar"),
  // Task 0054: access-tokens is a first-class Settings tab; honor legacy ?tab= deep links.
  "access-tokens": buildSettingsPath("access-tokens"),
  accessTokens: buildSettingsPath("access-tokens"),
} as const satisfies Record<string, `${typeof SETTINGS_HUB_BASE}/${SettingsTabValue}`>;

/** String-keyed lookup so unknown `?tab=` values fall back without cast. */
const LEGACY_TAB_ROUTE_MAP: ReadonlyMap<string, string> = new Map(
  Object.entries(LEGACY_TAB_ROUTES)
);

type SettingsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function resolveSettingsRoute(value: string | undefined): string {
  if (!value) return buildSettingsPath("general");
  return LEGACY_TAB_ROUTE_MAP.get(value) ?? buildSettingsPath("general");
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = searchParams ? await searchParams : {};
  const tab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  redirect(resolveSettingsRoute(tab));
}
