/**
 * Task 0054 — Settings hub PageTabBar navigation contracts.
 * Pure unit proof: tab inventory, path mapping, subnav visual SSoT, legacy redirects.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
  HUB_SUBNAV_ACTIVE_CLASS,
  HUB_SUBNAV_ITEM_BASE_CLASS,
  HUB_SUBNAV_SHELL_CLASS,
} from "../../../src/shared/constants/hubSubnavStyles";

const root = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

/** Exact 10-tab inventory — orphaned sub-pages must all be reachable from the bar. */
const EXPECTED_TABS: Array<{ value: string; label: string }> = [
  { value: "general", label: "Data & Storage" },
  { value: "appearance", label: "Interface" },
  { value: "ai", label: "AI" },
  { value: "routing", label: "Routing" },
  { value: "resilience", label: "Resilience" },
  { value: "security", label: "Security" },
  { value: "access-tokens", label: "Access Tokens" },
  { value: "feature-flags", label: "Feature Flags" },
  { value: "advanced", label: "Advanced" },
  { value: "sidebar", label: "Sidebar" },
];

test("SETTINGS_TABS exposes all 10 orphaned settings sub-pages in order", () => {
  assert.equal(SETTINGS_TABS.length, 10);
  assert.deepEqual(
    SETTINGS_TABS.map((t) => ({ value: t.value, label: t.label })),
    EXPECTED_TABS
  );
  // Theme-misleading label must not return (Task 0053 + 0061 Option B).
  assert.equal(
    SETTINGS_TABS.some((t) => t.label === "Appearance"),
    false
  );
  // Pricing is a costs redirect — not a Settings tab.
  assert.equal(SETTINGS_TAB_VALUES.includes("pricing"), false);
});

test("pathToTabValue maps every settings path; unknown falls back to general", () => {
  for (const value of SETTINGS_TAB_VALUES) {
    assert.equal(
      pathToTabValue(`${SETTINGS_HUB_BASE}/${value}`),
      value,
      `expected path segment "${value}" to highlight that tab`
    );
  }
  assert.equal(pathToTabValue(SETTINGS_HUB_BASE), "general");
  assert.equal(pathToTabValue("/dashboard/settings/pricing"), "general");
  assert.equal(pathToTabValue("/dashboard/settings/does-not-exist"), "general");
  assert.equal(pathToTabValue(""), "general");
});

test("isSettingsTabValue is parse-don't-validate gate for tab navigation", () => {
  for (const value of SETTINGS_TAB_VALUES) {
    assert.equal(isSettingsTabValue(value), true);
  }
  assert.equal(isSettingsTabValue("pricing"), false);
  assert.equal(isSettingsTabValue("Appearance"), false);
  assert.equal(isSettingsTabValue(""), false);
  // Type-level: narrowed value is assignable to SettingsTabValue (compile smoke via annotation).
  const sample: SettingsTabValue = "appearance";
  assert.equal(isSettingsTabValue(sample), true);
});

test("buildSettingsPath targets /dashboard/settings/{value} for every tab", () => {
  for (const value of SETTINGS_TAB_VALUES) {
    assert.equal(buildSettingsPath(value), `/dashboard/settings/${value}`);
  }
});

test("each Settings tab has a real page.tsx under the App Router tree", () => {
  for (const value of SETTINGS_TAB_VALUES) {
    const pagePath = join(
      root,
      "src/app/(dashboard)/dashboard/settings",
      value,
      "page.tsx"
    );
    assert.ok(existsSync(pagePath), `missing page for tab "${value}": ${pagePath}`);
  }
});

test("settings layout wires PageTabBar subnav + SSoT helpers (runtime navigation)", () => {
  const layout = read("src/app/(dashboard)/dashboard/settings/layout.tsx");
  assert.match(layout, /from "@\/shared\/constants\/settingsHub"/);
  assert.match(layout, /SETTINGS_TABS/);
  assert.match(layout, /pathToTabValue/);
  assert.match(layout, /buildSettingsPath/);
  assert.match(layout, /isSettingsTabValue/);
  assert.match(layout, /variant=["']subnav["']/);
  assert.match(layout, /syncSearchParam=\{false\}/);
  assert.match(layout, /router\.push\(buildSettingsPath/);
  assert.match(layout, /aria-label=["']Settings tabs["']/);
  // No spread clone — readonly options accept SETTINGS_TABS SSoT directly.
  assert.doesNotMatch(layout, /options=\{\[\.\.\.SETTINGS_TABS\]\}/);
  assert.match(layout, /options=\{SETTINGS_TABS\}/);
});

test("PageTabBar subnav + hub subnavs share Routing-style active/shell/item-base classes", () => {
  assert.match(HUB_SUBNAV_ACTIVE_CLASS, /border-primary\/20/);
  assert.match(HUB_SUBNAV_ACTIVE_CLASS, /bg-primary\/10/);
  assert.match(HUB_SUBNAV_ACTIVE_CLASS, /text-primary/);
  assert.doesNotMatch(HUB_SUBNAV_ACTIVE_CLASS, /bg-surface/);
  assert.match(HUB_SUBNAV_SHELL_CLASS, /rounded-xl/);
  assert.match(HUB_SUBNAV_SHELL_CLASS, /bg-black\/\[0\.02\]|bg-white\/\[0\.02\]/);
  // Item base carries explicit focus-visible ring (keyboard a11y) + density.
  assert.match(HUB_SUBNAV_ITEM_BASE_CLASS, /focus-visible:ring-2/);
  assert.match(HUB_SUBNAV_ITEM_BASE_CLASS, /focus-visible:ring-primary\/40/);

  const pageTabBar = read("src/shared/components/PageTabBar.tsx");
  assert.ok(pageTabBar.includes("HUB_SUBNAV_ACTIVE_CLASS"));
  assert.ok(pageTabBar.includes("HUB_SUBNAV_SHELL_CLASS"));
  assert.ok(pageTabBar.includes("HUB_SUBNAV_ITEM_BASE_CLASS"));
  // Default selected fill must remain available only for non-subnav.
  assert.match(pageTabBar, /bg-surface text-text-main/);

  const routing = read("src/shared/components/RoutingHubSubnav.tsx");
  const observe = read("src/shared/components/ObserveHubSubnav.tsx");
  for (const src of [routing, observe, pageTabBar]) {
    assert.ok(src.includes("HUB_SUBNAV_ACTIVE_CLASS"), "must use shared active class");
    assert.ok(src.includes("HUB_SUBNAV_SHELL_CLASS"), "must use shared shell class");
    assert.ok(src.includes("HUB_SUBNAV_ITEM_BASE_CLASS"), "must use shared item base class");
    assert.match(
      src,
      /material-symbols-outlined[^>]*aria-hidden=["']true["']/,
      "hub icon glyphs must be aria-hidden for AT"
    );
  }
});

test("legacy settings hub ?tab= redirects include access-tokens + appearance", () => {
  const hub = read("src/app/(dashboard)/dashboard/settings/page.tsx");
  // Built from buildSettingsPath / settingsHub SSoT — not free-floating path strings alone.
  assert.match(hub, /from "@\/shared\/constants\/settingsHub"/);
  assert.match(hub, /buildSettingsPath\("access-tokens"\)/);
  assert.match(hub, /accessTokens:\s*buildSettingsPath\("access-tokens"\)/);
  assert.match(hub, /appearance:\s*buildSettingsPath\("appearance"\)/);
  assert.match(hub, /general:\s*buildSettingsPath\("general"\)/);
  assert.match(hub, /LEGACY_TAB_ROUTE_MAP/);
});
