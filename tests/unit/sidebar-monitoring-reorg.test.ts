import test from "node:test";
import assert from "node:assert/strict";

const sidebarVisibility = await import("../../src/shared/constants/sidebarVisibility.ts");

function findSection(id: string) {
  return sidebarVisibility.SIDEBAR_SECTIONS.find((s) => s.id === id);
}

test("observability section exists (S6 successor of monitoring)", () => {
  const section = findSection("observability");
  assert.ok(section, "observability section must exist");
});

test("observability hosts Observe hub without log/audit multi-leaves (S4+S6)", () => {
  const section = findSection("observability");
  assert.ok(section, "observability section must exist");

  const items = sidebarVisibility.getSectionItems(section);
  const itemIds = items.map((i) => i.id);
  assert.ok(itemIds.includes("activity"), "activity Observe hub required");
  assert.ok(!itemIds.includes("logs-activity"));
  for (const id of ["logs", "logs-proxy", "logs-console", "audit", "audit-mcp", "audit-a2a"]) {
    assert.equal(itemIds.includes(id as sidebarVisibility.HideableSidebarItemId), false, id);
  }
});

test("observability activity item has correct href and icon", () => {
  const section = findSection("observability");
  assert.ok(section, "observability section must exist");

  const activityItem = sidebarVisibility
    .getSectionItems(section)
    .find((i) => i.id === "activity");

  assert.ok(activityItem, "activity item must be in observability section");
  assert.equal(activityItem.href, "/dashboard/activity");
  assert.equal(activityItem.icon, "timeline");
  assert.equal(activityItem.i18nKey, "activity");
});

test("health pulse is under core-pulse (not re-expanded as monitoring system group)", () => {
  const pulse = findSection("core-pulse");
  assert.ok(pulse);
  const ids = sidebarVisibility.getSectionItems(pulse).map((i) => i.id);
  assert.ok(ids.includes("health"));
  assert.ok(ids.includes("home"));
});

test("runtime lives under observability", () => {
  const section = findSection("observability");
  assert.ok(section);
  const ids = sidebarVisibility.getSectionItems(section).map((i) => i.id);
  assert.ok(ids.includes("runtime"));
});
