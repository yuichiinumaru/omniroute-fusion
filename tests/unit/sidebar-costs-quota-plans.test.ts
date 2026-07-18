/**
 * Phase C2 — Plans screen retired (unified into PoolWizard Step 2).
 * Flat primary: costs hub leaf + hideable deep links; no governance accordion.
 */
import test from "node:test";
import assert from "node:assert/strict";

const sidebarVisibility = await import("../../src/shared/constants/sidebarVisibility.ts");

const {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  COSTS_HUB_DEEP_LINK_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
  SIDEBAR_SECTIONS,
  getSectionItems,
} = sidebarVisibility;

function defaultLeafIds(): string[] {
  return SIDEBAR_SECTIONS.filter((s) => s.visibility !== "debug").flatMap((section) =>
    getSectionItems(section).map((i) => i.id)
  );
}

test("HIDEABLE_SIDEBAR_ITEM_IDS does NOT contain costs-quota-plans (retired)", () => {
  assert.ok(
    !(HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("costs-quota-plans"),
    "costs-quota-plans must have been removed from HIDEABLE_SIDEBAR_ITEM_IDS"
  );
});

test("costs-quota-plans is not a primary leaf", () => {
  assert.equal((PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes("costs-quota-plans"), false);
  assert.equal(defaultLeafIds().includes("costs-quota-plans"), false);
});

test("costs-quota-share remains hideable deep link under costs hub inventory", () => {
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("costs-quota-share"));
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("quota"));
  assert.ok((COSTS_HUB_DEEP_LINK_IDS as readonly string[]).includes("costs-quota-share"));
  assert.ok((COSTS_HUB_DEEP_LINK_IDS as readonly string[]).includes("quota"));
  // Order in hub inventory: quota before costs-quota-share (economics cluster)
  const ids = COSTS_HUB_DEEP_LINK_IDS as readonly string[];
  assert.ok(ids.indexOf("costs-quota-share") > ids.indexOf("quota"));
});
