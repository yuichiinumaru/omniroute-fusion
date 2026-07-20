/**
 * Task 0080 / EPIC-19 T19-C — Observe absorbs combo-health + route-trace (+ id=)
 * + health discoverability. Operational panels use ?panel= (not log source).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OBSERVE_HUB_PATH,
  OBSERVE_SOURCES,
  isObserveSource,
} from "../../../src/shared/constants/observeHub";
import {
  EPIC19_REDIRECT_MATRIX,
  OBSERVE_HEALTH_DEEP_LINK,
  OBSERVE_OPERATIONAL_PANELS,
  buildObserveComboHealthPath,
  buildObserveOperationalPanelPath,
  buildObserveRouteTracePath,
  isObserveOperationalPanel,
  resolveEpic19RouteTraceDestination,
  type Epic19RedirectEntry,
} from "../../../src/shared/constants/epic19Rebalance";

const root = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(root, rel), "utf-8");
}

const ANALYTICS_PAGE = "src/app/(dashboard)/dashboard/analytics/page.tsx";
const ANALYTICS_COMBO_HEALTH_NESTED =
  "src/app/(dashboard)/dashboard/analytics/combo-health/page.tsx";
const OBSERVE_HUB_CLIENT = "src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx";
const OBSERVE_SUBNAV = "src/shared/components/ObserveHubSubnav.tsx";
const ROUTE_TRACE_TAB =
  "src/app/(dashboard)/dashboard/analytics/RouteExplainabilityTab.tsx";

describe("0080 — EPIC19 matrix rows for Observe operational redirects", () => {
  const observe0080 = EPIC19_REDIRECT_MATRIX.filter((e) => e.ownerTask === "0080");

  it("owns exactly the combo-health + route-trace legacy froms (ownerTask 0080)", () => {
    const froms = observe0080.map((e) => e.from).sort();
    assert.deepEqual(froms, [
      "/dashboard/analytics/combo-health",
      "/dashboard/analytics?tab=combo-health",
      "/dashboard/analytics?tab=route-explain",
      "/dashboard/analytics?tab=route-trace",
    ].sort());
    for (const entry of observe0080) {
      assert.equal(entry.hub, "observe");
    }
  });

  it("maps combo-health froms to buildObserveComboHealthPath()", () => {
    for (const from of [
      "/dashboard/analytics?tab=combo-health",
      "/dashboard/analytics/combo-health",
    ]) {
      const row = EPIC19_REDIRECT_MATRIX.find((e) => e.from === from);
      assert.ok(row, `missing matrix row for ${from}`);
      assert.equal(row!.to, buildObserveComboHealthPath());
      assert.equal(row!.to, `${OBSERVE_HUB_PATH}?panel=combo-health`);
    }
  });

  it("maps route-trace + route-explain to buildObserveRouteTracePath()", () => {
    const trace = EPIC19_REDIRECT_MATRIX.find(
      (e) => e.from === "/dashboard/analytics?tab=route-trace"
    );
    const explain = EPIC19_REDIRECT_MATRIX.find(
      (e) => e.from === "/dashboard/analytics?tab=route-explain"
    );
    assert.ok(trace && explain);
    assert.equal(trace!.to, buildObserveRouteTracePath());
    assert.equal(explain!.to, buildObserveRouteTracePath());
    assert.equal(trace!.to, `${OBSERVE_HUB_PATH}?panel=route-trace`);
  });

  it("preserves id= deep link via resolveEpic19RouteTraceDestination / builder", () => {
    assert.equal(
      resolveEpic19RouteTraceDestination("req-0080"),
      `${OBSERVE_HUB_PATH}?panel=route-trace&id=req-0080`
    );
    assert.equal(
      buildObserveRouteTracePath("req-0080"),
      buildObserveOperationalPanelPath("route-trace", { id: "req-0080" })
    );
    assert.equal(resolveEpic19RouteTraceDestination(null), buildObserveRouteTracePath());
    assert.equal(resolveEpic19RouteTraceDestination(""), buildObserveRouteTracePath());
  });

  it("does not put operational panels into ObserveSource / OBSERVE_SOURCES", () => {
    for (const panel of OBSERVE_OPERATIONAL_PANELS) {
      assert.equal(isObserveSource(panel), false);
      assert.ok(!(OBSERVE_SOURCES as readonly string[]).includes(panel));
      assert.equal(isObserveOperationalPanel(panel), true);
    }
  });

  it("does not redirect storytelling analytics tabs (0081 owns those)", () => {
    for (const tab of ["overview", "evals", "search", "utilization", "compression"]) {
      const row = EPIC19_REDIRECT_MATRIX.find(
        (e) => e.from === `/dashboard/analytics?tab=${tab}`
      );
      assert.ok(row, `matrix should still document ${tab} for 0081`);
      assert.equal(row!.ownerTask, "0081");
      assert.equal(row!.hub, "dashboard");
    }
  });

  it("matrix entries are readonly-shaped", () => {
    for (const entry of observe0080 as readonly Epic19RedirectEntry[]) {
      assert.equal(typeof entry.from, "string");
      assert.equal(typeof entry.to, "string");
      assert.ok(entry.to.startsWith(`${OBSERVE_HUB_PATH}?panel=`));
    }
  });
});

describe("0080 — analytics page redirects only operational tabs", () => {
  it("analytics page redirects combo-health + route-trace/route-explain to Observe builders", () => {
    const src = readSrc(ANALYTICS_PAGE);
    assert.ok(
      src.includes("buildObserveComboHealthPath") || src.includes("buildObserveOperationalPanelPath"),
      "analytics page must use 0078 Observe combo-health builder"
    );
    assert.ok(
      src.includes("buildObserveRouteTracePath") ||
        src.includes("resolveEpic19RouteTraceDestination"),
      "analytics page must use 0078 Observe route-trace builder"
    );
    assert.ok(
      src.includes("redirect") || src.includes("router.replace") || src.includes("permanentRedirect"),
      "analytics page must redirect operational tabs"
    );
    assert.ok(
      src.includes("combo-health") &&
        (src.includes("route-trace") || src.includes("route-explain")),
      "must branch on operational tab values"
    );
  });

  it("analytics storytelling redirects to Dashboard (0081 owns content; 0080 keeps ops)", () => {
    const src = readSrc(ANALYTICS_PAGE);
    // 0081: storytelling tabs leave analytics shell for Dashboard builders.
    assert.ok(
      src.includes("buildDashboardStoryPath"),
      "storytelling analytics tabs redirect via buildDashboardStoryPath"
    );
    // Operational Observe redirects must remain (0080 exclusive).
    assert.ok(src.includes("buildObserveComboHealthPath"));
    assert.ok(
      src.includes("resolveEpic19RouteTraceDestination") ||
        src.includes("buildObserveRouteTracePath")
    );
    assert.equal(
      src.includes("<AnalyticsPageClient"),
      false,
      "analytics must not dual-host storytelling content after 0081"
    );
  });

  it("nested analytics/combo-health redirects to Observe combo-health builder", () => {
    const src = readSrc(ANALYTICS_COMBO_HEALTH_NESTED);
    assert.ok(src.includes("redirect") || src.includes("permanentRedirect"));
    assert.ok(
      src.includes("buildObserveComboHealthPath") ||
        src.includes("panel=combo-health") ||
        src.includes('panel: "combo-health"') ||
        src.includes('"combo-health"'),
      "nested combo-health must land on Observe panel"
    );
    // Prefer direct Observe builder over hop through analytics?tab=
    assert.ok(
      src.includes("buildObserveComboHealthPath") || src.includes(OBSERVE_HUB_PATH),
      "must target Observe hub path"
    );
  });
});

describe("0080 — Observe hub mounts operational panels via panel=", () => {
  it("ObserveHubClient reads panel= and mounts ComboHealth + RouteExplainability", () => {
    const src = readSrc(OBSERVE_HUB_CLIENT);
    assert.ok(
      src.includes("panel") || src.includes("isObserveOperationalPanel") ||
        src.includes("buildObserveOperationalPanelPath"),
      "must read operational panel query"
    );
    assert.ok(
      src.includes("ComboHealthTab") || src.includes("combo-health"),
      "must mount combo health surface"
    );
    assert.ok(
      src.includes("RouteExplainabilityTab") || src.includes("route-trace"),
      "must mount route-trace surface"
    );
    // Must not pollute log source enum usage with operational panel names as sources.
    assert.doesNotMatch(src, /normalizeObserveSource\(\s*["']combo-health["']\s*\)/);
    assert.doesNotMatch(src, /normalizeObserveSource\(\s*["']route-trace["']\s*\)/);
  });

  it("route-trace panel path reads id= for deep link (initialRequestId)", () => {
    const hub = readSrc(OBSERVE_HUB_CLIENT);
    assert.ok(
      hub.includes('searchParams.get("id")') || hub.includes("get(\"id\")"),
      "hub must read id query for deep links"
    );
    // RouteExplainabilityTab accepts initialRequestId prop somewhere in chain.
    assert.ok(
      hub.includes("initialRequestId") || hub.includes("initialSelectedId"),
      "must pass request id into route-trace panel"
    );
  });

  it("RouteExplainabilityTab keeps id= in URL on Observe panel=route-trace", () => {
    const src = readSrc(ROUTE_TRACE_TAB);
    assert.ok(
      src.includes('panel') && src.includes("route-trace"),
      "must sync id when hosted under Observe ?panel=route-trace"
    );
    assert.ok(src.includes('searchParams.set("id"') || src.includes('set("id"'));
  });
});

describe("0080 — health discoverability + no-new-leaf", () => {
  it("health remains discoverable on Observe hub (subnav + deep link constant)", () => {
    assert.equal(OBSERVE_HEALTH_DEEP_LINK, "/dashboard/health");
    const subnav = readSrc(OBSERVE_SUBNAV);
    assert.ok(subnav.includes("/dashboard/health") || subnav.includes(OBSERVE_HEALTH_DEEP_LINK));
    assert.ok(subnav.includes("data-observe-health-link") || subnav.includes('id: "health"'));
    const hub = readSrc(OBSERVE_HUB_CLIENT);
    assert.ok(hub.includes("ObserveHubSubnav"), "hub chrome must include subnav with health link");
  });

  it("does not add primary sidebar leaves for combo-health / route-trace / health", () => {
    for (const forbidden of ["combo-health", "route-trace", "health"]) {
      assert.ok(
        !(PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes(forbidden),
        `must not add primary leaf id=${forbidden}`
      );
      assert.ok(
        !PRIMARY_SIDEBAR_ITEMS.some((i) => i.id === forbidden || i.href?.includes(forbidden)),
        `PRIMARY_SIDEBAR_ITEMS must not surface ${forbidden}`
      );
    }
    // Post-0082: analytics primary leaf dropped (hideable id retained).
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("analytics"), false);
  });

  it("keeps hideable analytics-combo-health id for prefs archive-not-delete", () => {
    assert.ok(
      (HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("analytics-combo-health"),
      "analytics-combo-health hideable id must remain"
    );
  });
});
