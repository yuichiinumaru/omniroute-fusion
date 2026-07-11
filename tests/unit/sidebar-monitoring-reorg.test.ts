import test from "node:test";
import assert from "node:assert/strict";

const sidebarVisibility = await import("../../src/shared/constants/sidebarVisibility.ts");

test("flat primary nav exposes activity Observe hub", () => {
  const ids = sidebarVisibility.PRIMARY_SIDEBAR_ITEM_IDS;
  assert.ok(ids.includes("activity"), "activity Observe hub required");
  const activity = sidebarVisibility.PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "activity");
  assert.ok(activity);
  assert.equal(activity.href, "/dashboard/activity");
  assert.equal(activity.icon, "timeline");
});

test("collapsed stream leaves are not primary", () => {
  const ids = new Set(sidebarVisibility.PRIMARY_SIDEBAR_ITEM_IDS);
  for (const id of ["logs", "logs-proxy", "logs-console", "audit", "audit-mcp", "audit-a2a"]) {
    assert.equal(ids.has(id as sidebarVisibility.HideableSidebarItemId), false, id);
  }
});

test("no observability accordion section in chrome", () => {
  assert.equal(
    sidebarVisibility.SIDEBAR_SECTIONS.find((s) => s.id === "observability"),
    undefined
  );
});
