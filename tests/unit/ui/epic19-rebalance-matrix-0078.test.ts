/**
 * Task 0078 / EPIC-19 T19-A — freeze destination matrix + anti-leaf asserts.
 * Task 0082: live PRIMARY_SIDEBAR_ITEMS matches EPIC19_TARGET_PRIMARY_SIDEBAR_IDS.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OBSERVE_HUB_PATH,
  OBSERVE_SOURCES,
  isObserveSource,
} from "../../../src/shared/constants/observeHub";
import {
  DASHBOARD_STORY_HUB_PATH,
  DASHBOARD_STORY_TABS,
  EPIC19_FORBIDDEN_PRIMARY_LEAF_IDS,
  EPIC19_LEAVES_TO_DROP,
  EPIC19_REDIRECT_MATRIX,
  EPIC19_TARGET_PRIMARY_SIDEBAR_IDS,
  OBSERVE_HEALTH_DEEP_LINK,
  OBSERVE_OPERATIONAL_PANELS,
  PROVIDERS_BUDGET_PATH,
  PROVIDERS_PRICING_PATH,
  PROVIDERS_QUOTA_SHARE_PATH,
  buildDashboardStoryPath,
  buildObserveComboHealthPath,
  buildObserveOperationalPanelPath,
  buildObserveRouteTracePath,
  buildProvidersBudgetPath,
  buildProvidersPricingPath,
  buildProvidersQuotaSharePath,
  isDashboardStoryTab,
  isObserveOperationalPanel,
  resolveEpic19RouteTraceDestination,
  type DashboardStoryTab,
  type Epic19RedirectEntry,
} from "../../../src/shared/constants/epic19Rebalance";

describe("EPIC-19 path builders — mandatory freeze shapes (no “or”)", () => {
  it("Providers config uses nested routes under /dashboard/providers/*", () => {
    assert.equal(buildProvidersBudgetPath(), "/dashboard/providers/budget");
    assert.equal(buildProvidersPricingPath(), "/dashboard/providers/pricing");
    assert.equal(buildProvidersQuotaSharePath(), "/dashboard/providers/quota-share");
    assert.equal(buildProvidersBudgetPath(), PROVIDERS_BUDGET_PATH);
    assert.equal(buildProvidersPricingPath(), PROVIDERS_PRICING_PATH);
    assert.equal(buildProvidersQuotaSharePath(), PROVIDERS_QUOTA_SHARE_PATH);
  });

  it("does not offer Providers destinations as ?tab= on providers root", () => {
    for (const builder of [
      buildProvidersBudgetPath,
      buildProvidersPricingPath,
      buildProvidersQuotaSharePath,
    ]) {
      const path = builder();
      assert.ok(!path.includes("?"), `${path} must be nested path, not query tab`);
      assert.ok(path.startsWith("/dashboard/providers/"));
    }
  });

  it("Observe operational panels use ?panel= on Observe hub (not log source)", () => {
    assert.equal(buildObserveComboHealthPath(), `${OBSERVE_HUB_PATH}?panel=combo-health`);
    assert.equal(buildObserveRouteTracePath(), `${OBSERVE_HUB_PATH}?panel=route-trace`);
    assert.equal(
      buildObserveOperationalPanelPath("combo-health"),
      buildObserveComboHealthPath()
    );
  });

  it("route-trace preserves optional id= deep link", () => {
    assert.equal(
      buildObserveRouteTracePath("req-abc"),
      `${OBSERVE_HUB_PATH}?panel=route-trace&id=req-abc`
    );
    assert.equal(
      resolveEpic19RouteTraceDestination("req-xyz"),
      buildObserveRouteTracePath("req-xyz")
    );
    assert.equal(resolveEpic19RouteTraceDestination(null), buildObserveRouteTracePath());
    assert.equal(resolveEpic19RouteTraceDestination(""), buildObserveRouteTracePath());
  });

  it("does not put combo-health / route-trace into ObserveSource enum", () => {
    const observeSources: readonly string[] = OBSERVE_SOURCES;
    for (const panel of OBSERVE_OPERATIONAL_PANELS) {
      assert.equal(isObserveSource(panel), false, `${panel} must not be a log source`);
      assert.ok(!observeSources.includes(panel), `${panel} must not appear in OBSERVE_SOURCES`);
      assert.equal(isObserveOperationalPanel(panel), true);
    }
  });

  it("Dashboard storytelling is always /home?tab=<id> (live home href)", () => {
    assert.equal(DASHBOARD_STORY_HUB_PATH, "/home");
    for (const tab of DASHBOARD_STORY_TABS) {
      const path = buildDashboardStoryPath(tab);
      assert.equal(path, `/home?tab=${tab}`);
      assert.ok(isDashboardStoryTab(tab));
    }
  });

  it("health remains deep link /dashboard/health", () => {
    assert.equal(OBSERVE_HEALTH_DEEP_LINK, "/dashboard/health");
  });
});

describe("EPIC19_REDIRECT_MATRIX — from→to + builder alignment", () => {
  it("covers Epic §4 core rows + inventory legacy aliases", () => {
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
      "/dashboard/analytics?tab=route-explain",
      "/dashboard/analytics?tab=evals",
      "/dashboard/analytics?tab=search",
      "/dashboard/analytics?tab=utilization",
      "/dashboard/analytics?tab=compression",
      "/dashboard/usage?tab=budget",
      "/dashboard/settings/pricing",
      "/dashboard/analytics/combo-health",
    ]) {
      assert.ok(froms.includes(required), `matrix missing from=${required}`);
    }
  });

  it("every matrix `to` matches a canonical builder (no divergent ad-hoc strings)", () => {
    const allowedTos = new Set<string>([
      buildProvidersBudgetPath(),
      buildProvidersPricingPath(),
      buildProvidersQuotaSharePath(),
      buildObserveComboHealthPath(),
      buildObserveRouteTracePath(),
      ...DASHBOARD_STORY_TABS.map((t) => buildDashboardStoryPath(t)),
    ]);

    for (const entry of EPIC19_REDIRECT_MATRIX) {
      assert.ok(
        allowedTos.has(entry.to),
        `from=${entry.from} to=${entry.to} is not a builder product`
      );
    }
  });

  it("single shape per destination family (no dual nested vs ?tab= for Providers)", () => {
    const providerTos = EPIC19_REDIRECT_MATRIX.filter((e) => e.hub === "providers").map(
      (e) => e.to
    );
    for (const to of providerTos) {
      assert.match(to, /^\/dashboard\/providers\/(budget|pricing|quota-share)$/);
    }
    const observeTos = EPIC19_REDIRECT_MATRIX.filter((e) => e.hub === "observe").map(
      (e) => e.to
    );
    for (const to of observeTos) {
      assert.ok(to.startsWith(`${OBSERVE_HUB_PATH}?panel=`));
      assert.ok(!to.includes("source=combo-health") && !to.includes("source=route-trace"));
    }
    const dashTos = EPIC19_REDIRECT_MATRIX.filter((e) => e.hub === "dashboard").map(
      (e) => e.to
    );
    for (const to of dashTos) {
      assert.match(to, /^\/home\?tab=/);
    }
  });

  it("route-explain and route-trace both land on same Observe panel builder", () => {
    const explain = EPIC19_REDIRECT_MATRIX.find(
      (e) => e.from === "/dashboard/analytics?tab=route-explain"
    );
    const trace = EPIC19_REDIRECT_MATRIX.find(
      (e) => e.from === "/dashboard/analytics?tab=route-trace"
    );
    assert.ok(explain && trace);
    assert.equal(explain!.to, trace!.to);
    assert.equal(explain!.to, buildObserveRouteTracePath());
  });

  it("owner tasks cover 0079 / 0080 / 0081 slices", () => {
    const owners = new Set(EPIC19_REDIRECT_MATRIX.map((e) => e.ownerTask));
    assert.ok(owners.has("0079"));
    assert.ok(owners.has("0080"));
    assert.ok(owners.has("0081"));
  });

  it("matrix rows are readonly-shaped entries with hub + from + to", () => {
    for (const entry of EPIC19_REDIRECT_MATRIX as readonly Epic19RedirectEntry[]) {
      assert.equal(typeof entry.from, "string");
      assert.equal(typeof entry.to, "string");
      assert.ok(["providers", "observe", "dashboard"].includes(entry.hub));
      assert.ok(entry.from.length > 0);
      assert.ok(entry.to.length > 0);
    }
  });

  it("every matrix `from` is unique (no ambiguous dual rows)", () => {
    const froms = EPIC19_REDIRECT_MATRIX.map((r) => r.from);
    assert.equal(froms.length, new Set(froms).size, "duplicate from= rows in EPIC19_REDIRECT_MATRIX");
    assert.ok(EPIC19_REDIRECT_MATRIX.length >= 16, "matrix must cover Epic §4 + inventory aliases");
  });
});

describe("EPIC-19 anti-leaf + pre-cutover snapshot", () => {
  it("target primary chrome is length 7 without analytics/costs", () => {
    assert.equal(EPIC19_TARGET_PRIMARY_SIDEBAR_IDS.length, 7);
    assert.deepEqual([...EPIC19_TARGET_PRIMARY_SIDEBAR_IDS], [
      "home",
      "providers",
      "combos",
      "activity",
      "operations",
      "settings-general",
      "docs",
    ]);
    for (const dropped of EPIC19_LEAVES_TO_DROP) {
      assert.ok(
        !(EPIC19_TARGET_PRIMARY_SIDEBAR_IDS as readonly string[]).includes(dropped)
      );
    }
  });

  it("does not promote playground / translator / search-tools / labs to primary", () => {
    for (const id of EPIC19_FORBIDDEN_PRIMARY_LEAF_IDS) {
      assert.ok(
        !(EPIC19_TARGET_PRIMARY_SIDEBAR_IDS as readonly string[]).includes(id),
        `forbidden primary leaf: ${id}`
      );
      assert.ok(
        !(PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes(id),
        `live primary must not include forbidden lab id: ${id}`
      );
    }
  });

  it("post-cutover (0082): live PRIMARY_SIDEBAR matches target (no analytics/costs)", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
    assert.deepEqual([...PRIMARY_SIDEBAR_ITEM_IDS], [...EPIC19_TARGET_PRIMARY_SIDEBAR_IDS]);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("analytics"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("costs"), false);
    assert.equal(
      PRIMARY_SIDEBAR_ITEMS.some((i) => i.href === "/dashboard/analytics"),
      false
    );
    assert.equal(
      PRIMARY_SIDEBAR_ITEMS.some((i) => i.href === "/dashboard/costs"),
      false
    );
  });

  it("storytelling tabs are exactly the locked Dashboard set", () => {
    const expected: DashboardStoryTab[] = [
      "overview",
      "evals",
      "search",
      "utilization",
      "compression",
      "costs-overview",
    ];
    assert.deepEqual([...DASHBOARD_STORY_TABS], expected);
  });
});
