/**
 * Flat primary sidebar: ~10 leaves, no accordion groups, no carnival icons.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  PRIMARY_SIDEBAR_ITEMS,
  PRIMARY_SIDEBAR_ITEM_IDS,
  SIDEBAR_SECTIONS,
  countPresetVisibleLeaves,
  getSidebarIconAccent,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";

describe("flat primary sidebar nav", () => {
  it("exposes at most 10 primary leaves", () => {
    assert.ok(PRIMARY_SIDEBAR_ITEMS.length <= 10);
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, PRIMARY_SIDEBAR_ITEM_IDS.length);
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 10);
  });

  it("SIDEBAR_SECTIONS is main + optional debug only (no pillar accordion sections)", () => {
    const ids = SIDEBAR_SECTIONS.map((s) => s.id);
    assert.deepEqual(ids, ["main", "devtools"]);
    assert.equal(SIDEBAR_SECTIONS[0].showTitle, false);
  });

  it("main section has no nested groups", () => {
    const main = SIDEBAR_SECTIONS.find((s) => s.id === "main");
    assert.ok(main);
    for (const child of main!.children) {
      assert.ok(!("type" in child && (child as { type?: string }).type === "group"));
    }
    assert.equal(getSectionItems(main!).length, 10);
  });

  it("all preset shows exactly 10 non-debug leaves", () => {
    assert.equal(countPresetVisibleLeaves("all"), 10);
  });

  it("minimal is a short role view ≤ 10", () => {
    const n = countPresetVisibleLeaves("minimal");
    assert.ok(n <= 10);
    assert.ok(n >= 5);
  });

  it("icons are neutral (currentColor) — no carnival accents", () => {
    for (const id of PRIMARY_SIDEBAR_ITEM_IDS) {
      assert.equal(getSidebarIconAccent(id), "currentColor");
    }
    assert.equal(getSidebarIconAccent("providers"), "currentColor");
    assert.equal(getSidebarIconAccent("analytics"), "currentColor");
  });

  it("primary hubs cover product areas without gamification", () => {
    const ids = new Set(PRIMARY_SIDEBAR_ITEM_IDS);
    assert.ok(ids.has("home"));
    assert.ok(ids.has("providers"));
    assert.ok(ids.has("combos"));
    assert.ok(ids.has("api-manager"));
    assert.ok(ids.has("activity"));
    assert.ok(ids.has("settings-general"));
    assert.ok(!ids.has("leaderboard"));
    assert.ok(!ids.has("tokens"));
  });
});
