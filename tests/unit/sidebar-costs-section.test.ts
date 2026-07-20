/**
 * Costs IA under flat primary chrome (Epic 0005 S6 / Task 0025 path-to-100).
 * EPIC-19 / Task 0082: `costs` is no longer a primary leaf (Dashboard + Providers homes).
 * Deep cost routes remain hideable-only. Pre-flat "governance" accordion is gone.
 */
import test from "node:test";
import assert from "node:assert/strict";

const sidebarVisibility = await import("../../src/shared/constants/sidebarVisibility.ts");

const {
  PRIMARY_SIDEBAR_ITEM_IDS,
  HIDEABLE_SIDEBAR_ITEM_IDS,
  COSTS_HUB_DEEP_LINK_IDS,
  SIDEBAR_SECTIONS,
  getSectionItems,
  OPERATIONAL_PILLAR_SECTION_IDS,
} = sidebarVisibility;

function defaultLeafIds(): string[] {
  return SIDEBAR_SECTIONS.filter((s) => s.visibility !== "debug").flatMap((section) =>
    getSectionItems(section).map((i) => i.id)
  );
}

test("costs is not a primary leaf (EPIC-19 / 0082) and not a governance accordion section", () => {
  assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("costs"), false);
  assert.equal(defaultLeafIds().includes("costs"), false);
  // Hideable id retained for prefs (archive-not-delete)
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("costs"));
  // Flat chrome: no accordion sections named governance / observability
  assert.equal(
    SIDEBAR_SECTIONS.some((s) => s.id === "governance"),
    false
  );
  assert.equal(
    SIDEBAR_SECTIONS.some((s) => s.id === "observability"),
    false
  );
});

test("deep cost destinations stay hideable, not primary peers", () => {
  const leaves = defaultLeafIds();
  for (const id of COSTS_HUB_DEEP_LINK_IDS) {
    assert.ok(
      (HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes(id),
      `expected hideable id "${id}"`
    );
    assert.equal(leaves.includes(id), false, `"${id}" must not be a primary leaf`);
  }
});

test("cost deep-link ids cover pricing, budget, free-tiers, rankings, quota share", () => {
  for (const id of [
    "costs-pricing",
    "costs-budget",
    "costs-free-tiers",
    "free-provider-rankings",
    "costs-quota-share",
  ] as const) {
    assert.ok(
      (COSTS_HUB_DEEP_LINK_IDS as readonly string[]).includes(id),
      `COSTS_HUB_DEEP_LINK_IDS must include "${id}"`
    );
  }
});

test("governance remains a conceptual pillar id (not a chrome section)", () => {
  assert.ok((OPERATIONAL_PILLAR_SECTION_IDS as readonly string[]).includes("governance"));
  assert.ok((OPERATIONAL_PILLAR_SECTION_IDS as readonly string[]).includes("routing"));
  assert.ok((OPERATIONAL_PILLAR_SECTION_IDS as readonly string[]).includes("operations"));
  const gIdx = OPERATIONAL_PILLAR_SECTION_IDS.indexOf("governance");
  const rIdx = OPERATIONAL_PILLAR_SECTION_IDS.indexOf("routing");
  const oIdx = OPERATIONAL_PILLAR_SECTION_IDS.indexOf("operations");
  assert.ok(rIdx < gIdx && gIdx < oIdx, "conceptual order: routing < governance < operations");
});
