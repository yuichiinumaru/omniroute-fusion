import test from "node:test";
import assert from "node:assert/strict";

const sidebarVisibility = await import("../../src/shared/constants/sidebarVisibility.ts");

const {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  SIDEBAR_SECTIONS,
  SIDEBAR_PRESETS,
  applySectionOrder,
  applyItemOrder,
  normalizeHiddenSidebarItems,
} = sidebarVisibility;

// ─── applySectionOrder ────────────────────────────────────────────────────────

test("applySectionOrder returns original order when order is empty", () => {
  const sections = [...SIDEBAR_SECTIONS];
  const result = applySectionOrder(sections, []);
  assert.deepEqual(
    result.map((s) => s.id),
    sections.map((s) => s.id)
  );
});

test("applySectionOrder reorders sections by provided list (flat main+devtools)", () => {
  // Live chrome: only main + devtools (not 7 accordion pillars).
  const sections = [...SIDEBAR_SECTIONS];
  assert.ok(sections.length >= 2, "expected main + devtools");
  const ids = sections.map((s) => s.id) as any[];
  const reversed = [...ids].reverse();
  const result = applySectionOrder(sections, reversed);
  assert.deepEqual(
    result.map((s) => s.id),
    reversed
  );
});

test("applySectionOrder ignores unknown section IDs in order", () => {
  const sections = [...SIDEBAR_SECTIONS];
  const ids = sections.map((s) => s.id) as any[];
  const orderWithUnknown = ["totally-unknown-section" as any, ids[1], ids[0]];
  const result = applySectionOrder(sections, orderWithUnknown);
  assert.equal(result[0].id, ids[1]);
  assert.equal(result[1].id, ids[0]);
});

test("applySectionOrder appends sections not in order list at end", () => {
  const sections = [...SIDEBAR_SECTIONS];
  const ids = sections.map((s) => s.id) as any[];
  // Only pin first section; remaining must append in original relative order.
  const result = applySectionOrder(sections, [ids[0]]);
  assert.equal(result[0].id, ids[0]);
  assert.equal(result.length, sections.length);
  assert.ok(result.some((s) => s.id === ids[1]));
});

// ─── applyItemOrder ───────────────────────────────────────────────────────────

test("applyItemOrder returns original children when order is empty", () => {
  const section = SIDEBAR_SECTIONS.find((s) => s.id === "main")!;
  assert.ok(section, "main section must exist in flat chrome");
  const children = [...section.children];
  const result = applyItemOrder(children, []);
  assert.deepEqual(result.length, children.length);
});

test("applyItemOrder reorders items by provided list", () => {
  const section = SIDEBAR_SECTIONS.find((s) => s.id === "main")!;
  const children = [...section.children] as any[];
  const ids = children.map((c) => c.id);
  const reversed = [...ids].reverse();
  const result = applyItemOrder(children, reversed) as any[];
  assert.deepEqual(
    result.map((c) => c.id),
    reversed
  );
});

test("applyItemOrder ignores unknown IDs in order list", () => {
  const section = SIDEBAR_SECTIONS.find((s) => s.id === "main")!;
  const children = [...section.children] as any[];
  const ids = children.map((c) => c.id);
  const orderWithUnknown = ["ghost-item", ids[1], ids[0], ids[2]];
  const result = applyItemOrder(children, orderWithUnknown) as any[];
  assert.equal(result[0].id, ids[1]);
  assert.equal(result[1].id, ids[0]);
  assert.equal(result[2].id, ids[2]);
});

// ─── SIDEBAR_PRESETS ──────────────────────────────────────────────────────────

test("SIDEBAR_PRESETS contains all four preset IDs", () => {
  const ids = SIDEBAR_PRESETS.map((p) => p.id);
  assert.ok(ids.includes("all"), "expected 'all' preset");
  assert.ok(ids.includes("minimal"), "expected 'minimal' preset");
  assert.ok(ids.includes("developer"), "expected 'developer' preset");
  assert.ok(ids.includes("admin"), "expected 'admin' preset");
});

test("SIDEBAR_PRESETS all preset hiddenItems are valid HIDEABLE_SIDEBAR_ITEM_IDS", () => {
  const validIds = new Set(HIDEABLE_SIDEBAR_ITEM_IDS);
  for (const preset of SIDEBAR_PRESETS) {
    for (const id of preset.hiddenItems) {
      assert.ok(validIds.has(id as any), `Preset '${preset.id}' contains invalid item ID: '${id}'`);
    }
  }
});

test("SIDEBAR_PRESETS 'all' preset has no hidden items", () => {
  const allPreset = SIDEBAR_PRESETS.find((p) => p.id === "all");
  assert.ok(allPreset, "expected 'all' preset to exist");
  assert.deepEqual(allPreset.hiddenItems, []);
});

test("SIDEBAR_PRESETS non-all presets have at least one hidden item", () => {
  for (const preset of SIDEBAR_PRESETS.filter((p) => p.id !== "all")) {
    assert.ok(preset.hiddenItems.length > 0, `Preset '${preset.id}' should hide at least one item`);
  }
});

// ─── settings-sidebar ID ─────────────────────────────────────────────────────

test("settings-sidebar is in HIDEABLE_SIDEBAR_ITEM_IDS", () => {
  assert.ok(
    HIDEABLE_SIDEBAR_ITEM_IDS.includes("settings-sidebar" as any),
    "settings-sidebar should be hideable"
  );
});

test("settings-sidebar remains hideable (flat chrome has no system accordion)", () => {
  // Flat primary nav: settings live under settings-general hub + deep routes.
  // settings-sidebar is prefs-only hideable, not a rendered system section leaf.
  assert.ok(
    HIDEABLE_SIDEBAR_ITEM_IDS.includes("settings-sidebar" as any),
    "settings-sidebar should remain hideable for stored prefs"
  );
  assert.equal(
    SIDEBAR_SECTIONS.some((s) => s.id === "system"),
    false,
    "flat chrome must not reintroduce a system accordion section"
  );
});

// ─── normalizeHiddenSidebarItems ─────────────────────────────────────────────

test("normalizeHiddenSidebarItems accepts settings-sidebar", () => {
  const result = normalizeHiddenSidebarItems(["settings-sidebar"]);
  assert.deepEqual(result, ["settings-sidebar"]);
});

test("normalizeHiddenSidebarItems drops unknown IDs", () => {
  const result = normalizeHiddenSidebarItems(["settings-sidebar", "ghost-id-xyz"]);
  assert.deepEqual(result, ["settings-sidebar"]);
});
