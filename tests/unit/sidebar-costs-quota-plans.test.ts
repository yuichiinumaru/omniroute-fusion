/**
 * Phase C2 — Plans screen retired (unified into PoolWizard Step 2).
 * Epic 0005 S6 — cost/quota economics live under Governance.
 */
import test from "node:test";
import assert from "node:assert/strict";

const sidebarVisibility = await import("../../src/shared/constants/sidebarVisibility.ts");

function sectionItems(sectionId: string) {
  const section = sidebarVisibility.SIDEBAR_SECTIONS.find((s) => s.id === sectionId);
  assert.ok(section, `expected section "${sectionId}" to exist`);
  return sidebarVisibility.getSectionItems(section);
}

test("HIDEABLE_SIDEBAR_ITEM_IDS does NOT contain costs-quota-plans (retired)", () => {
  assert.ok(
    !(sidebarVisibility.HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("costs-quota-plans"),
    "costs-quota-plans must have been removed from HIDEABLE_SIDEBAR_ITEM_IDS"
  );
});

test("governance does not include costs-quota-plans item (retired)", () => {
  const items = sectionItems("governance");
  const ids = items.map((i) => i.id);
  assert.ok(!ids.includes("costs-quota-plans"), "governance must NOT include costs-quota-plans");
});

test("governance DOES contain costs-quota-share next to quota (S6 re-home)", () => {
  const items = sectionItems("governance");
  const ids = items.map((i) => i.id);
  assert.ok(ids.includes("costs-quota-share"), "costs-quota-share under governance");
  assert.ok(ids.includes("quota"), "quota under governance");
  assert.ok(ids.indexOf("costs-quota-share") > ids.indexOf("quota"));
});
