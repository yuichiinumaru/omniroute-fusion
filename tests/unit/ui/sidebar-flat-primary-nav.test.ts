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
    // Task 0082 / EPIC-19: analytics + costs dropped → 7 primary leaves
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
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
    assert.equal(getSectionItems(main!).length, 7);
  });

  it("all preset shows exactly primary non-debug leaves", () => {
    assert.equal(countPresetVisibleLeaves("all"), PRIMARY_SIDEBAR_ITEMS.length);
    assert.equal(countPresetVisibleLeaves("all"), 7);
  });

  it("minimal is a short role view ≤ 12 (task contract; stretch ≤ 10)", () => {
    const n = countPresetVisibleLeaves("minimal");
    // Epic 0005 / Task 0025: default visible leaves on minimal ≤ 12 (stretch ≤ 8–10)
    assert.ok(n <= 12, `minimal=${n} exceeds contract ≤12`);
    assert.ok(n <= 10, `minimal=${n} exceeds stretch ≤10`);
    assert.ok(n >= 5);
    assert.equal(n, 7);
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
    assert.ok(ids.has("operations"));
    assert.ok(ids.has("activity"));
    assert.ok(ids.has("settings-general"));
    // API Keys absorbed into Operations hub (Task 0059); hideable id retained
    assert.ok(!ids.has("api-manager"));
    assert.ok(!ids.has("leaderboard"));
    assert.ok(!ids.has("tokens"));
    // EPIC-19 / 0082: analytics + costs not primary
    assert.ok(!ids.has("analytics"));
    assert.ok(!ids.has("costs"));
  });

  it("Operations primary leaf points at /operations hub (EPIC-20 / 0087)", () => {
    const ops = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "operations");
    assert.ok(ops);
    assert.equal(ops.href, "/operations");
    assert.equal(ops.i18nKey, "operationsNav");
    assert.equal(ops.labelFallback, "Operations");
  });
});

describe("sidebar chrome a11y contracts (Task 0025 path-to-100)", () => {
  it("collapse control is not wrapped in aria-hidden; nav exposes aria-current", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const src = readFileSync(
      join(import.meta.dirname, "../../../src/shared/components/Sidebar.tsx"),
      "utf8"
    );
    assert.ok(src.includes('aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}'));
    // Outer chrome row must not use aria-hidden (would hide the collapse control from AT)
    assert.equal(
      /onToggleCollapse \|\| !isMacElectron\) && \(\s*<div[^>]*aria-hidden="true"/s.test(src),
      false,
      "collapse chrome row must not use aria-hidden=\"true\" on the parent"
    );
    assert.ok(src.includes('aria-current={active ? "page" : undefined}'));
    assert.ok(src.includes('aria-label={t("restart")}'));
    assert.ok(src.includes('aria-label={t("shutdown")}'));
  });
});
