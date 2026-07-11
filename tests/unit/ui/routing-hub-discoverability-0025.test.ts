/**
 * Task 0025 path-to-100 — Fusion under Routing hub (flat chrome).
 * Fusions are not a primary sidebar peer; discover via Routing in-page subnav + palette.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

test("RoutingHubSubnav links Combos, Fusions, Compression", () => {
  const src = read("src/shared/components/RoutingHubSubnav.tsx");
  assert.ok(src.includes("/dashboard/combos"));
  assert.ok(src.includes("/dashboard/fusions"));
  assert.ok(src.includes("/dashboard/compression/studio"));
});

test("CommandPalette includes fusions hub destination", () => {
  const src = read("src/shared/components/CommandPalette.tsx");
  assert.ok(src.includes('href: "/dashboard/fusions"'));
  assert.ok(src.includes('id: "fusions"'));
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
