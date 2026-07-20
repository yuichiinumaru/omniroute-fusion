/**
 * Task 0061 — Observe + Settings small IA gaps.
 * Health discoverable from Observe chrome (not a log-stream tab); Settings Interface tab.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  HEALTH_NAV_ITEM,
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OBSERVE_SOURCES,
  OBSERVE_HUB_PATH,
  buildObserveHubPath,
} from "../../../src/shared/constants/observeHub";
import {
  SETTINGS_TABS,
  pathToTabValue,
} from "../../../src/shared/constants/settingsHub";
import {
  HUB_SUBNAV_ACTIVE_CLASS,
  HUB_SUBNAV_SHELL_CLASS,
} from "../../../src/shared/constants/hubSubnavStyles";

const root = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

const OBSERVE_SUBNAV_IDS = [
  "activity",
  "request",
  "proxy",
  "console",
  "audit",
  "mcp",
  "a2a",
  "health",
] as const;

test("Health is not a primary sidebar leaf (primary-nav budget)", () => {
  assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("health"), false);
  // Task 0082 / EPIC-19: 7 primary leaves (analytics + costs dropped)
  assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("health"));
});

test("HEALTH_NAV_ITEM points at the health dashboard page", () => {
  assert.equal(HEALTH_NAV_ITEM.id, "health");
  assert.equal(HEALTH_NAV_ITEM.href, "/dashboard/health");
  assert.equal(HEALTH_NAV_ITEM.labelFallback, "Health");
  assert.equal(HEALTH_NAV_ITEM.icon, "health_and_safety");
});

test("ObserveHubSubnav lists all Observe streams + Health with Routing active style", () => {
  const subnav = read("src/shared/components/ObserveHubSubnav.tsx");
  assert.ok(subnav.includes("HUB_SUBNAV_ACTIVE_CLASS"));
  assert.ok(subnav.includes("HUB_SUBNAV_SHELL_CLASS"));
  assert.ok(subnav.includes("data-observe-health-link"));
  assert.ok(subnav.includes("HEALTH_NAV_ITEM"));
  assert.ok(subnav.includes("/dashboard/health"));
  for (const id of OBSERVE_SUBNAV_IDS) {
    assert.ok(subnav.includes(`id: "${id}"`), `Observe subnav must declare link id "${id}"`);
  }
  assert.ok(subnav.includes('href: "/dashboard/health"'));
  // Type-level exhaustiveness: LINKS covers every ObserveHubActive (and vice versa).
  assert.match(subnav, /_AssertObserveLinksCoverActive|_observeLinksExhaustive/);
  assert.match(subnav, /as const satisfies readonly ObserveHubLink/);
  // Must not use the default PageTabBar gray selected fill as primary affordance.
  assert.doesNotMatch(subnav, /bg-surface text-text-main/);
  // Shared contract tokens exist.
  assert.equal(HUB_SUBNAV_ACTIVE_CLASS, "border border-primary/20 bg-primary/10 text-primary");
  assert.ok(HUB_SUBNAV_SHELL_CLASS.includes("rounded-xl"));
  // Decorative icons must not be announced twice (match PageTabBar a11y contract).
  assert.match(subnav, /material-symbols-outlined[^>]*aria-hidden=["']true["']/);
  assert.match(subnav, /aria-current=\{isActive \? ["']page["'] : undefined\}/);
  assert.match(subnav, /aria-label=["']Observe sections["']/);
});

test("Observe hub links to Health without making it a log-stream tab", () => {
  const hub = read("src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx");
  assert.ok(hub.includes("ObserveHubSubnav"));
  assert.equal((OBSERVE_SOURCES as readonly string[]).includes("health"), false);
  assert.doesNotMatch(hub, /id:\s*"health"/);
  // Stream viewers only — Health stays a separate page.
  assert.doesNotMatch(hub, /active=["']health["']/);
  // Exhaustive switch over ObserveSource for panel dispatch.
  assert.match(hub, /function renderObserveSourcePanel/);
  assert.match(hub, /const _exhaustive:\s*never\s*=\s*source/);
});

test("Health page mounts ObserveHubSubnav with active=health", () => {
  const page = read("src/app/(dashboard)/dashboard/health/page.tsx");
  assert.ok(page.includes("ObserveHubSubnav"));
  assert.match(page, /<ObserveHubSubnav\s+active=["']health["']\s*\/>/);
  // Loading + error branches also keep the single Observe strip (no chrome drop).
  const mounts = page.match(/<ObserveHubSubnav\b/g) ?? [];
  assert.equal(mounts.length, 3, "loading, error, and success each mount ObserveHubSubnav once");
  // Must not mount Dashboard/Analytics/Operations chrome in this fix loop.
  assert.doesNotMatch(page, /RoutingHubSubnav|AnalyticsHub|OperationsHub/);
  // Structural unity with Observe hub: full-width subnav first, not side-by-side with actions.
  assert.doesNotMatch(page, /sm:flex-row sm:items-center sm:justify-between/);
  // Icon-only refresh must expose an accessible name.
  assert.match(page, /aria-label=\{tc\(["']refresh["']\)\}/);
});

test("proxy logs redirect still targets Observe hub proxy source", () => {
  const src = read("src/app/(dashboard)/dashboard/logs/proxy/page.tsx");
  assert.ok(src.includes("buildObserveHubPath"));
  assert.ok(src.includes('"proxy"') || src.includes("'proxy'"));
  assert.equal(buildObserveHubPath("proxy"), `${OBSERVE_HUB_PATH}?source=proxy`);
});

test("CommandPalette surfaces Health as an observe extra", () => {
  const src = read("src/shared/components/CommandPalette.tsx");
  assert.ok(src.includes("observeHubExtras"));
  assert.ok(src.includes('href: "/dashboard/health"'));
  assert.ok(src.includes('id: "health"'));
});

test("Settings tabbar includes Interface tab on appearance route value", () => {
  const interfaceTab = SETTINGS_TABS.find((t) => t.value === "appearance");
  assert.ok(interfaceTab);
  assert.equal(interfaceTab?.label, "Interface");
  assert.equal(interfaceTab?.icon, "display_settings");
  assert.equal(pathToTabValue("/dashboard/settings/appearance"), "appearance");
  assert.equal(
    SETTINGS_TABS.some((t) => t.label === "Appearance"),
    false
  );

  const layout = read("src/app/(dashboard)/dashboard/settings/layout.tsx");
  assert.ok(layout.includes("SETTINGS_TABS"));
  assert.ok(layout.includes("pathToTabValue"));
  assert.ok(layout.includes('variant="subnav"') || layout.includes("variant={'subnav'}"));

  // Header chrome for the appearance route uses Interface (not theme) copy.
  const header = read("src/shared/components/Header.tsx");
  assert.match(header, /Settings → Interface/);
  assert.match(header, /title:\s*["']Interface["']/);
  assert.doesNotMatch(
    header.slice(header.indexOf("Settings → Interface"), header.indexOf("Settings → Interface") + 400),
    /Theme, branding/
  );

  // English SSoT strings no longer imply theme/branding customization (Option B).
  const en = JSON.parse(read("src/i18n/messages/en.json")) as {
    sidebar: Record<string, string>;
    header: Record<string, string>;
  };
  assert.equal(en.sidebar.settingsAppearance, "Interface");
  assert.doesNotMatch(en.sidebar.settingsAppearanceSubtitle ?? "", /theme/i);
  assert.doesNotMatch(en.header.settingsAppearanceDescription ?? "", /theme|branding/i);
});

test("Appearance page keeps functional prefs and no theme customization UI", () => {
  const page = read("src/app/(dashboard)/dashboard/settings/appearance/page.tsx");
  assert.ok(page.includes("AppearanceTab"));
  const tab = read("src/app/(dashboard)/dashboard/settings/components/AppearanceTab.tsx");
  assert.doesNotMatch(tab, /COLOR_THEMES/);
  assert.doesNotMatch(tab, /setColorTheme|setCustomColorTheme/);
  assert.doesNotMatch(tab, /t\("themeAccent"\)/);
  assert.doesNotMatch(tab, /t\("whitelabeling"\)/);
  assert.match(tab, /AccountEmailVisibilitySetting/);
  assert.match(tab, /comboConfigMode/);
  assert.match(tab, /endpointTunnelVisibility|hideEndpointCloudflaredTunnel/);
});

test("Observe primary leaf subtitle mentions health; Settings mentions interface", () => {
  const observe = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "activity");
  assert.ok(observe);
  assert.match(observe.subtitleFallback ?? "", /health/i);

  const settings = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "settings-general");
  assert.ok(settings);
  assert.match(settings.subtitleFallback ?? "", /interface/i);
});
