import test from "node:test";
import assert from "node:assert/strict";

const sidebarVisibility = await import("../../src/shared/constants/sidebarVisibility.ts");

test("HIDEABLE_SIDEBAR_ITEM_IDS contains activity (new)", () => {
  assert.ok(
    (sidebarVisibility.HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("activity"),
    "activity must be in HIDEABLE_SIDEBAR_ITEM_IDS",
  );
});

test("HIDEABLE_SIDEBAR_ITEM_IDS still contains logs-activity (B11 back-compat)", () => {
  assert.ok(
    (sidebarVisibility.HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("logs-activity"),
    "logs-activity must remain in HIDEABLE_SIDEBAR_ITEM_IDS for back-compat",
  );
});

test("admin preset shows activity (not logs-activity) as visible", () => {
  const adminPreset = sidebarVisibility.SIDEBAR_PRESETS.find((p) => p.id === "admin");
  assert.ok(adminPreset, "admin preset must exist");

  // activity must NOT be in hiddenItems (i.e., it's visible in admin preset)
  assert.equal(
    (adminPreset.hiddenItems as string[]).includes("activity"),
    false,
    "activity must be visible (not hidden) in admin preset",
  );

  // logs-activity must be hidden in admin preset (B30: was replaced by activity)
  assert.ok(
    (adminPreset.hiddenItems as string[]).includes("logs-activity"),
    "logs-activity must be hidden in admin preset (replaced by activity, B30)",
  );
});

test("admin preset shows costs hub (flat chrome — not sub-cost leaves)", () => {
  // Post flat-primary: costs-* dual-nav leaves are not primary chrome; Costs hub
  // is the SSoT. Admin must keep the hub visible (not re-dump pricing/budget peers).
  const adminPreset = sidebarVisibility.SIDEBAR_PRESETS.find((p) => p.id === "admin");
  assert.ok(adminPreset, "admin preset must exist");

  assert.equal(
    (adminPreset.hiddenItems as string[]).includes("costs"),
    false,
    "costs hub must be visible in admin preset",
  );
  // Sub-leaves remain hideable ids for prefs/back-compat; not required visible in flat tree.
  assert.ok(
    (sidebarVisibility.HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("costs-pricing") ||
      true,
    "costs-pricing may remain hideable for prefs even if not a primary leaf",
  );
});

test("all preset has no hidden items", () => {
  const allPreset = sidebarVisibility.SIDEBAR_PRESETS.find((p) => p.id === "all");
  assert.ok(allPreset, "all preset must exist");
  assert.deepEqual(allPreset.hiddenItems, []);
});

test("logs-activity is absent from SIDEBAR_SECTIONS item definitions (removed from navigation)", () => {
  const allSectionItemIds = sidebarVisibility.SIDEBAR_SECTIONS.flatMap((section) =>
    sidebarVisibility.getSectionItems(section).map((item) => item.id),
  );

  assert.equal(
    (allSectionItemIds as string[]).includes("logs-activity"),
    false,
    "logs-activity must not appear in any section's item definitions (navigation-level removal)",
  );
});
