/**
 * Task 0025 path-to-100 — Fusion under Routing hub (flat chrome).
 * Fusions are not a primary sidebar peer; discover via Routing in-page subnav + palette.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ENGINE_IDS } from "../../../open-sse/services/compression/engineCatalog.ts";
import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  SIDEBAR_SECTIONS,
  countPresetVisibleLeaves,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";

const root = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("fusions is not a default primary sidebar leaf", () => {
  assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("fusions"), false);
  const leaves = SIDEBAR_SECTIONS.filter((s) => s.visibility !== "debug").flatMap((s) =>
    getSectionItems(s).map((i) => i.id)
  );
  assert.equal(leaves.includes("fusions"), false);
});

test("combos Routing hub mounts RoutingHubSubnav", () => {
  const src = read("src/app/(dashboard)/dashboard/combos/page.tsx");
  assert.ok(src.includes("RoutingHubSubnav"));
  assert.ok(src.includes('active="combos"'));
});

test("fusions page mounts RoutingHubSubnav", () => {
  const src = read("src/app/(dashboard)/dashboard/fusions/page.tsx");
  assert.ok(src.includes("RoutingHubSubnav"));
  assert.ok(src.includes('active="fusions"'));
});

test("RoutingHubSubnav links Combos, Fusions, Live, Compression Settings, Compression Studio", () => {
  // Task 0058 expands the Routing hub topbar.
  const src = read("src/shared/components/RoutingHubSubnav.tsx");
  assert.ok(src.includes("/dashboard/combos"));
  assert.ok(src.includes("/dashboard/fusions"));
  assert.ok(src.includes("/dashboard/combos/live"));
  assert.ok(src.includes("/dashboard/context/settings"));
  assert.ok(src.includes("/dashboard/compression/studio"));
  assert.ok(src.includes("Compression Settings"));
  assert.ok(src.includes("Compression Studio"));
  assert.ok(src.includes('id: "live"'));
  assert.ok(src.includes('id: "compression-settings"'));
  assert.ok(src.includes('id: "compression-studio"'));
});

test("compression root redirects to context settings (Task 0058)", () => {
  const src = read("src/app/(dashboard)/dashboard/compression/page.tsx");
  assert.ok(src.includes('redirect("/dashboard/context/settings")'));
  assert.equal(src.includes("/dashboard/context/caveman"), false);
});

test("context settings composes enabled engine sections (Task 0058)", () => {
  const page = read("src/app/(dashboard)/dashboard/context/settings/page.tsx");
  assert.ok(page.includes("EnabledEngineSections"));
  assert.ok(page.includes('active="compression-settings"'));
  // F1: settings page bridges panel → sections via onEnginesChange / engines prop.
  assert.ok(page.includes("onEnginesChange"));
  assert.ok(page.includes("handleEnginesChange") || page.includes("setEngines"));
  assert.ok(page.includes("engines={engines}") || page.includes("engines={"));
  const sections = read(
    "src/app/(dashboard)/dashboard/context/settings/EnabledEngineSections.tsx"
  );
  assert.ok(sections.includes("ENGINE_IDS"));
  assert.ok(sections.includes("/api/settings/compression"));
  assert.ok(sections.includes("EngineConfigPage"));
  assert.ok(sections.includes("CavemanContextPageClient"));
  assert.ok(sections.includes("RtkContextPageClient"));
  // F2: embedded chrome variant on all three embed paths.
  assert.ok(sections.includes("embedded"));
  assert.ok(sections.includes("<CavemanContextPageClient embedded"));
  assert.ok(sections.includes("<RtkContextPageClient embedded"));
  assert.ok(sections.includes("embedded />") || sections.includes("embedded={true}") || sections.includes("embedded "));
});

test("CompressionPanel notifies onEnginesChange (Task 0058 F1)", () => {
  const panel = read("src/app/(dashboard)/dashboard/context/settings/CompressionPanel.tsx");
  assert.ok(panel.includes("onEnginesChange"));
  assert.ok(panel.includes("onEnginesChange?.(") || panel.includes("onEnginesChange?."));
  // F1 type SSOT: normalized engine toggle exported for settings page bridge.
  assert.ok(panel.includes("export type CompressionEngineToggle"));
  const page = read("src/app/(dashboard)/dashboard/context/settings/page.tsx");
  assert.ok(page.includes("CompressionEngineToggle"));
  const sections = read(
    "src/app/(dashboard)/dashboard/context/settings/EnabledEngineSections.tsx"
  );
  assert.ok(sections.includes("CompressionEngineToggle"));
});

test("caveman suppresses CompressionSettingsTab when embedded (Task 0058 F2)", () => {
  const src = read(
    "src/app/(dashboard)/dashboard/context/caveman/CavemanContextPageClient.tsx"
  );
  assert.ok(src.includes("embedded"));
  assert.ok(src.includes("!embedded") && src.includes("CompressionSettingsTab"));
  assert.match(src, /viewMode === "advanced" && !embedded && <CompressionSettingsTab/);
});

test("every catalog compression engine has a standalone context route", () => {
  for (const id of ENGINE_IDS) {
    assert.equal(
      existsSync(join(root, `src/app/(dashboard)/dashboard/context/${id}/page.tsx`)),
      true,
      `missing standalone route for compression engine ${id}`
    );
  }
});

test("live and studio pages mount RoutingHubSubnav (Task 0058)", () => {
  const live = read("src/app/(dashboard)/dashboard/combos/live/page.tsx");
  assert.ok(live.includes("RoutingHubSubnav"));
  assert.ok(live.includes('active="live"'));
  const studio = read("src/app/(dashboard)/dashboard/compression/studio/page.tsx");
  assert.ok(studio.includes("RoutingHubSubnav"));
  assert.ok(studio.includes('active="compression-studio"'));
});

test("hub subnav links expose keyboard focus-visible ring (Task 0058 a11y)", () => {
  const src = read("src/shared/constants/hubSubnavStyles.ts");
  assert.ok(src.includes("focus-visible:ring-2"));
  assert.ok(src.includes("HUB_SUBNAV_ITEM_BASE_CLASS"));
});

test("CommandPalette includes Routing hub destinations (Task 0025 + 0058 N1)", () => {
  const src = read("src/shared/components/CommandPalette.tsx");
  assert.ok(src.includes('href: "/dashboard/fusions"'));
  assert.ok(src.includes('id: "fusions"'));
  // Task 0058 N1: Live + Compression Settings discoverable via palette (not only topbar).
  assert.ok(src.includes('href: "/dashboard/combos/live"'));
  assert.ok(src.includes('id: "combos-live"'));
  assert.ok(src.includes('href: "/dashboard/context/settings"'));
  assert.ok(src.includes('id: "compression-settings"'));
  assert.ok(src.includes('href: "/dashboard/compression/studio"'));
  assert.ok(src.includes('id: "compression-studio"'));
});

test("role presets: minimal < developer primary chrome < admin", () => {
  const minimal = countPresetVisibleLeaves("minimal");
  const developer = countPresetVisibleLeaves("developer");
  const admin = countPresetVisibleLeaves("admin");
  const all = countPresetVisibleLeaves("all");
  assert.ok(minimal <= 10, `minimal=${minimal}`);
  assert.ok(minimal < developer, `minimal ${minimal} should be < developer ${developer}`);
  // admin shows full primary (includes docs); developer omits docs → developer ≤ admin
  assert.ok(developer <= admin, `developer ${developer} should be ≤ admin ${admin}`);
  assert.equal(admin, all, "admin primary visible count matches all for flat chrome");
});
