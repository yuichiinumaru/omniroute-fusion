/**
 * Task 0061 — Observe + Settings small IA gaps.
 * Health discoverable from Observe (not a log-stream tab); Settings Interface tab.
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

const root = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("Health is not a primary sidebar leaf (primary-nav budget)", () => {
  assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("health"), false);
  assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 9);
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("health"));
});

test("HEALTH_NAV_ITEM points at the health dashboard page", () => {
  assert.equal(HEALTH_NAV_ITEM.id, "health");
  assert.equal(HEALTH_NAV_ITEM.href, "/dashboard/health");
  assert.equal(HEALTH_NAV_ITEM.labelFallback, "Health");
  assert.equal(HEALTH_NAV_ITEM.icon, "health_and_safety");
});

test("Observe hub links to Health without making it a log-stream tab", () => {
  const hub = read("src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx");
  assert.ok(hub.includes("HEALTH_NAV_ITEM"));
  assert.ok(hub.includes("data-observe-health-link"));
  assert.ok(hub.includes("/dashboard/health") || hub.includes("HEALTH_NAV_ITEM.href"));
  // Must remain stream sources only (no health ObserveSource).
  assert.equal((OBSERVE_SOURCES as readonly string[]).includes("health"), false);
  assert.doesNotMatch(hub, /id:\s*"health"/);
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
  const layout = read("src/app/(dashboard)/dashboard/settings/layout.tsx");
  assert.ok(layout.includes('value: "appearance"'));
  assert.ok(layout.includes('label: "Interface"'));
  assert.ok(layout.includes("pathToTabValue"));
  // Theme/branding customization must not return via this tab label alone.
  assert.doesNotMatch(layout, /label:\s*"Appearance"/);
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
