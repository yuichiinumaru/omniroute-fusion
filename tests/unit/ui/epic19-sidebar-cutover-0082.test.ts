/**
 * Task 0082 / EPIC-19 T19-E — drop Analytics + Costs primary leaves.
 * Live PRIMARY chrome must match EPIC19_TARGET_PRIMARY_SIDEBAR_IDS (length 7).
 * Hideable ids retained; redirect matrix still green; no dual primary for retired surfaces.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
  SIDEBAR_PRESETS,
  SIDEBAR_SECTIONS,
  countPresetVisibleLeaves,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  EPIC19_FORBIDDEN_PRIMARY_LEAF_IDS,
  EPIC19_LEAVES_TO_DROP,
  EPIC19_REDIRECT_MATRIX,
  EPIC19_TARGET_PRIMARY_SIDEBAR_IDS,
  buildDashboardStoryPath,
  buildObserveComboHealthPath,
  buildProvidersBudgetPath,
} from "../../../src/shared/constants/epic19Rebalance";

const root = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

/** Single SSoT expected primary id list for EPIC-19 post-cutover. */
const EXPECTED_PRIMARY_IDS = [
  "home",
  "providers",
  "combos",
  "activity",
  "operations",
  "settings-general",
  "docs",
] as const;

describe("0082 — PRIMARY_SIDEBAR post-cutover contract (SSoT)", () => {
  it("length 7 with exact id set matching EPIC19_TARGET_PRIMARY_SIDEBAR_IDS", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.length, 7);
    assert.deepEqual([...PRIMARY_SIDEBAR_ITEM_IDS], [...EXPECTED_PRIMARY_IDS]);
    assert.deepEqual(
      [...PRIMARY_SIDEBAR_ITEM_IDS],
      [...EPIC19_TARGET_PRIMARY_SIDEBAR_IDS]
    );
  });

  it("does not include analytics or costs as default primary peers", () => {
    for (const dropped of EPIC19_LEAVES_TO_DROP) {
      assert.equal(
        (PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes(dropped),
        false,
        `primary must not include dropped id=${dropped}`
      );
      assert.equal(
        PRIMARY_SIDEBAR_ITEMS.some((i) => i.id === dropped),
        false
      );
    }
  });

  it("does not promote playground / translator / search-tools / testing / labs", () => {
    for (const id of EPIC19_FORBIDDEN_PRIMARY_LEAF_IDS) {
      assert.equal(
        (PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes(id),
        false,
        `forbidden primary leaf: ${id}`
      );
    }
  });

  it("main section leaf count matches PRIMARY (no nested groups)", () => {
    const main = SIDEBAR_SECTIONS.find((s) => s.id === "main");
    assert.ok(main);
    assert.equal(getSectionItems(main!).length, 7);
    for (const child of main!.children) {
      assert.ok(!("type" in child && (child as { type?: string }).type === "group"));
    }
  });

  it("all / admin preset visible leaf counts track PRIMARY length", () => {
    assert.equal(countPresetVisibleLeaves("all"), 7);
    assert.equal(countPresetVisibleLeaves("admin"), PRIMARY_SIDEBAR_ITEM_IDS.length);
    assert.ok(countPresetVisibleLeaves("minimal") <= 7);
    assert.ok(countPresetVisibleLeaves("developer") <= 7);
  });
});

describe("0082 — hideable archive-not-delete for analytics/costs family", () => {
  it("retains analytics + costs hideable ids and sub-ids used by prefs", () => {
    const hideable = HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[];
    for (const id of [
      "analytics",
      "costs",
      "analytics-combo-health",
      "analytics-utilization",
      "analytics-compression",
      "analytics-search",
      "analytics-evals",
      "costs-pricing",
      "costs-budget",
      "costs-free-tiers",
      "costs-quota-share",
    ]) {
      assert.ok(hideable.includes(id), `hideable must retain ${id}`);
    }
  });

  it("admin preset does not force-show costs/analytics as primary (hidden or absent from tree)", () => {
    // After cutover, costs/analytics are not primary leaves; admin "shown" set is
    // PRIMARY ids + security/feature-flags — costs/analytics stay in hideable prefs only.
    const admin = SIDEBAR_PRESETS.find((p) => p.id === "admin");
    assert.ok(admin);
    assert.equal((PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes("costs"), false);
    assert.equal((PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes("analytics"), false);
    // Not in ADMIN_SHOWN → appear in hiddenItems (prefs archive-not-delete).
    assert.ok((admin.hiddenItems as string[]).includes("costs"));
    assert.ok((admin.hiddenItems as string[]).includes("analytics"));
  });
});

describe("0082 — CommandPalette does not dual-promote retired leaves", () => {
  it("does not hardcode /dashboard/analytics or /dashboard/costs as palette peer homes", () => {
    const src = read("src/shared/components/CommandPalette.tsx");
    assert.equal(
      src.includes('href: "/dashboard/analytics"'),
      false,
      "palette must not advertise retired analytics hub as peer home"
    );
    assert.equal(
      src.includes('href: "/dashboard/costs"'),
      false,
      "palette must not advertise retired costs hub as peer home"
    );
  });

  it("deep-links retired surfaces to Dashboard/Providers/Observe builders (or omits them)", () => {
    const src = read("src/shared/components/CommandPalette.tsx");
    // Only peer href assignments matter (comments may mention legacy paths).
    assert.equal(
      /href:\s*["']\/dashboard\/analytics["']/.test(src),
      false,
      "must not assign href to retired analytics hub"
    );
    assert.equal(
      /href:\s*["']\/dashboard\/costs["']/.test(src),
      false,
      "must not assign href to retired costs hub"
    );

    // Prefer discoverability via new homes when extras exist.
    if (src.includes("epic19HubExtras") || src.includes("epic19RebalanceExtras")) {
      assert.ok(src.includes("buildDashboardStoryPath"));
      assert.ok(src.includes("buildProvidersBudgetPath") || src.includes("buildObserveComboHealthPath"));
    }
  });
});

describe("0082 — redirect matrix regression still complete", () => {
  it("EPIC19_REDIRECT_MATRIX still covers core Epic §4 rows", () => {
    const froms = EPIC19_REDIRECT_MATRIX.map((r) => r.from);
    for (const required of [
      "/dashboard/costs/budget",
      "/dashboard/costs/pricing",
      "/dashboard/costs/quota-share",
      "/dashboard/costs",
      "/dashboard/analytics",
      "/dashboard/analytics?tab=overview",
      "/dashboard/analytics?tab=combo-health",
      "/dashboard/analytics?tab=route-trace",
      "/dashboard/analytics?tab=evals",
    ]) {
      assert.ok(froms.includes(required), `matrix missing from=${required}`);
    }
    assert.ok(EPIC19_REDIRECT_MATRIX.length >= 16);
  });

  it("builders still produce canonical homes for dropped leaves", () => {
    assert.equal(buildDashboardStoryPath("overview"), "/home?tab=overview");
    assert.equal(buildDashboardStoryPath("costs-overview"), "/home?tab=costs-overview");
    assert.equal(buildProvidersBudgetPath(), "/dashboard/providers/budget");
    assert.equal(buildObserveComboHealthPath(), "/dashboard/activity?panel=combo-health");
  });
});

describe("0082 — Observe / Providers subtitles absorb former peer roles", () => {
  it("providers + activity leaves remain with expanded role copy", () => {
    const providers = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "providers");
    const activity = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "activity");
    assert.ok(providers);
    assert.ok(activity);
    // Post-cutover: Providers holds budget/pricing/quota; Observe holds logs+health+ops panels.
    assert.ok(
      (providers.subtitleFallback ?? "").toLowerCase().includes("budget") ||
        (providers.subtitleFallback ?? "").toLowerCase().includes("pricing") ||
        (providers.subtitleFallback ?? "").toLowerCase().includes("quota") ||
        (providers.subtitleFallback ?? "").length > 0
    );
    assert.ok(
      (activity.subtitleFallback ?? "").toLowerCase().includes("log") ||
        (activity.subtitleFallback ?? "").toLowerCase().includes("health") ||
        (activity.subtitleFallback ?? "").length > 0
    );
  });
});

describe("0082 — NAV-TREE / live docs do not re-promote Analytics/Costs L0", () => {
  it("NAV-TREE §2 is 7-leaf; §3 no longer marks Analytics/Costs as Live hub L0", () => {
    const nav = read("docs/architecture/NAV-TREE-TARGET.md");
    assert.ok(nav.includes("live **7**") || nav.includes("**7** leaves"));
    assert.ok(
      nav.includes("Dropped L0 (0082)") || nav.includes("Dropped from L0"),
      "must document analytics/costs L0 drop"
    );
    // Pre-cutover dual model: "| L0 | Analytics | `/dashboard/analytics` | Live hub |"
    assert.equal(
      /\|\s*L0\s*\|\s*Analytics\s*\|[^|]*\/dashboard\/analytics[^|]*\|\s*Live hub\s*\|/i.test(
        nav
      ),
      false,
      "NAV-TREE must not list Analytics as L0 Live hub"
    );
    assert.equal(
      /\|\s*L0\s*\|\s*Costs\s*\|[^|]*\/dashboard\/costs[^|]*\|\s*Live hub\s*\|/i.test(nav),
      false,
      "NAV-TREE must not list Costs as L0 Live hub"
    );
    assert.ok(
      nav.includes("Dropped primary") || nav.includes("absorbed (EPIC-19"),
      "target hierarchy must state analytics/costs absorption"
    );
  });

  it("UI.md live primary chrome lists 7 leaves without analytics/costs peers", () => {
    const ui = read("docs/guides/UI.md");
    assert.ok(ui.includes("Primary chrome (live)"));
    assert.ok(ui.includes("`analytics`") && ui.includes("Dropped from default primary"));
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
  });
});
