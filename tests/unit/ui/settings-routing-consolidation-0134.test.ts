/**
 * Task 0134 — Settings AI + Resilience consolidation into Routing hub.
 * Anti-phantom single-topbar, legacy redirects, component union, and active-state proof.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  SETTINGS_TABS,
  SETTINGS_TAB_VALUES,
  SETTINGS_HUB_BASE,
  buildSettingsPath,
  isSettingsTabValue,
  pathToTabValue,
  type SettingsTabValue,
} from "../../../src/shared/constants/settingsHub";
import {
  getActiveSidebarHref,
  resolveSidebarHubAlias,
} from "../../../src/shared/utils/sidebarRouteMatch";
import { resolveDeepHeaderTitleFallback } from "../../../src/shared/components/Header";
import { HIDEABLE_SIDEBAR_ITEM_IDS } from "../../../src/shared/constants/sidebarVisibility";

const root = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

const PRIMARY_ITEMS = [
  { id: "home", href: "/home", exact: true },
  { id: "providers", href: "/dashboard/providers" },
  { id: "combos", href: "/dashboard/combos" },
  { id: "activity", href: "/dashboard/activity" },
  { id: "operations", href: "/operations" },
  { id: "settings-general", href: "/dashboard/settings/general" },
  { id: "docs", href: "/docs", external: true },
] as const;

test("SETTINGS_TABS contains 8 tabs, removing AI and Resilience peer entries", () => {
  assert.equal(SETTINGS_TABS.length, 8);
  const values = SETTINGS_TABS.map((t) => t.value);
  assert.deepEqual(values, [
    "general",
    "appearance",
    "routing",
    "security",
    "access-tokens",
    "feature-flags",
    "advanced",
    "sidebar",
  ]);
  assert.equal(values.includes("ai" as unknown as SettingsTabValue), false, "ai peer tab must be removed");
  assert.equal(values.includes("resilience" as unknown as SettingsTabValue), false, "resilience peer tab must be removed");
  assert.equal(isSettingsTabValue("ai"), false);
  assert.equal(isSettingsTabValue("resilience"), false);
});

test("pathToTabValue maps legacy ai/resilience paths to routing", () => {
  assert.equal(pathToTabValue(`${SETTINGS_HUB_BASE}/routing`), "routing");
  assert.equal(pathToTabValue(`${SETTINGS_HUB_BASE}/ai`), "routing");
  assert.equal(pathToTabValue(`${SETTINGS_HUB_BASE}/resilience`), "routing");
});

test("legacy routes settings/ai and settings/resilience exist as redirect shells to routing", () => {
  const aiPagePath = join(root, "src/app/(dashboard)/dashboard/settings/ai/page.tsx");
  const resiliencePagePath = join(root, "src/app/(dashboard)/dashboard/settings/resilience/page.tsx");
  assert.ok(existsSync(aiPagePath), "settings/ai/page.tsx must exist as redirect shell");
  assert.ok(existsSync(resiliencePagePath), "settings/resilience/page.tsx must exist as redirect shell");

  const aiSrc = read("src/app/(dashboard)/dashboard/settings/ai/page.tsx");
  const resilienceSrc = read("src/app/(dashboard)/dashboard/settings/resilience/page.tsx");

  assert.match(aiSrc, /redirect\(/);
  assert.match(aiSrc, /routing/);
  assert.match(resilienceSrc, /redirect\(/);
  assert.match(resilienceSrc, /routing/);

  // Anti-phantom: redirect shells must not mount components or duplicate topbars
  assert.doesNotMatch(aiSrc, /<PageTabBar/);
  assert.doesNotMatch(aiSrc, /<ThinkingBudgetTab/);
  assert.doesNotMatch(resilienceSrc, /<PageTabBar/);
  assert.doesNotMatch(resilienceSrc, /<ResilienceTab/);
});

test("legacy settings ?tab=ai and ?tab=resilience redirect to routing", () => {
  const hubSrc = read("src/app/(dashboard)/dashboard/settings/page.tsx");
  assert.match(hubSrc, /ai:\s*buildSettingsPath\(\s*["']routing["']\s*\)/);
  assert.match(hubSrc, /resilience:\s*buildSettingsPath\(\s*["']routing["']\s*\)/);
});

test("Routing page renders union of existing AI, routing, and resilience components exactly once", () => {
  const routingPage = read("src/app/(dashboard)/dashboard/settings/routing/page.tsx");

  const expectedComponents = [
    "ComboDefaultsTab",
    "ModelAliasesUnified",
    "FallbackChainsEditor",
    "ModelRoutingSection",
    "RoutingTab",
    "BackgroundDegradationTab",
    "ThinkingBudgetTab",
    "VisionBridgeSettingsTab",
    "SystemPromptTab",
    "ResponsesStatePolicyTab",
    "UsageTokenBufferTab",
    "CodexFastTierTab",
    "ClaudeFastModeTab",
    "MemorySkillsTab",
    "ModelsDevSyncTab",
    "ResilienceTab",
  ];

  for (const comp of expectedComponents) {
    const matches = routingPage.match(new RegExp(`<${comp}\\b`, "g")) ?? [];
    assert.equal(
      matches.length,
      1,
      `component ${comp} must be rendered exactly once in routing/page.tsx`
    );
  }
});

test("active state resolution lights Settings for settings/routing and deep paths", () => {
  assert.equal(
    getActiveSidebarHref("/dashboard/settings/routing", [...PRIMARY_ITEMS]),
    "/dashboard/settings/general"
  );
  assert.equal(
    getActiveSidebarHref("/dashboard/settings/ai", [...PRIMARY_ITEMS]),
    "/dashboard/settings/general"
  );
  assert.equal(
    getActiveSidebarHref("/dashboard/settings/resilience", [...PRIMARY_ITEMS]),
    "/dashboard/settings/general"
  );

  const aliasRouting = resolveSidebarHubAlias("/dashboard/settings/routing");
  assert.ok(aliasRouting);
  assert.equal(aliasRouting?.primaryLeafId, "settings-general");
  assert.equal(aliasRouting?.primaryHref, "/dashboard/settings/general");
});

test("Header deep title fallback resolves Routing title for settings/routing", () => {
  assert.equal(resolveDeepHeaderTitleFallback("/dashboard/settings/routing"), "Routing");
});

test("hideable sidebar item IDs retain settings-ai and settings-resilience for user prefs", () => {
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("settings-ai"));
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("settings-resilience"));
});
