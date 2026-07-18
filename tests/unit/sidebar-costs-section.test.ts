/**
 * Costs IA under flat primary chrome (Epic 0005 S6 / Task 0025 path-to-100).
 * Single `costs` primary leaf; deep cost routes are hideable-only (in-page tabs).
 * Pre-flat "governance" accordion section no longer exists.
 */
import test from "node:test";
import assert from "node:assert/strict";

const sidebarVisibility = await import("../../src/shared/constants/sidebarVisibility.ts");

const {
  PRIMARY_SIDEBAR_ITEMS,
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

test("costs is a primary flat leaf (not a governance accordion section)", () => {
  assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("costs"));
  assert.ok(defaultLeafIds().includes("costs"));
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

test("costs primary leaf points at costs hub", () => {
  const costs = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "costs");
  assert.ok(costs, "costs primary item must exist");
  assert.equal(costs.href, "/dashboard/costs");
  assert.equal(costs.i18nKey, "costsNav");
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
