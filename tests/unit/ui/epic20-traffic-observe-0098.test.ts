/**
 * Task 0098 / EPIC-20 T20-M — Traffic Inspector → Observe topbar peer (NOT Operations).
 * Frozen path: `/dashboard/activity?panel=traffic` (EPIC20_TRAFFIC_INSPECTOR_PATH).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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
  OBSERVE_OPERATIONAL_PANELS,
  buildObserveOperationalPanelPath,
  buildObserveTrafficPanelPath,
  isObserveOperationalPanel,
} from "../../../src/shared/constants/epic19Rebalance";
import {
  EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS,
  EPIC20_TRAFFIC_INSPECTOR_PATH,
  OBSERVE_TRAFFIC_PANEL,
  OPERATIONS_REDIRECT_MATRIX,
  OPERATIONS_TOPBAR_IDS,
  buildObserveTrafficInspectorPath,
  isOperationsTopbarId,
} from "../../../src/shared/constants/epic20Operations";
import {
  OPERATIONS_HUB_HREFS,
  OPERATIONS_HUB_GROUPS,
} from "../../../src/shared/constants/operationsHub";
import {
  getActiveSidebarHref,
  resolveSidebarHubAlias,
  SIDEBAR_ACTIVE_HUB_ALIASES,
} from "../../../src/shared/utils/sidebarRouteMatch";

const root = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(root, rel), "utf-8");
}

const OBSERVE_SUBNAV = "src/shared/components/ObserveHubSubnav.tsx";
const OBSERVE_HUB_CLIENT = "src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx";
const TRAFFIC_LEGACY_PAGE =
  "src/app/(dashboard)/dashboard/tools/traffic-inspector/page.tsx";
const SPAWN_PREFIXES = "src/shared/constants/spawnCapablePrefixes.ts";
const ROUTE_GUARD = "src/server/authz/routeGuard.ts";

const PRIMARY_ITEMS = [
  { id: "home", href: "/home", exact: true },
  { id: "providers", href: "/dashboard/providers" },
  { id: "combos", href: "/dashboard/combos" },
  { id: "activity", href: "/dashboard/activity" },
  { id: "operations", href: "/operations" },
  { id: "settings-general", href: "/dashboard/settings/general" },
  { id: "docs", href: "/docs", external: true },
] as const;

describe("0098 — frozen Traffic Inspector path (one string)", () => {
  it("freezes EPIC20_TRAFFIC_INSPECTOR_PATH = /dashboard/activity?panel=traffic", () => {
    assert.equal(EPIC20_TRAFFIC_INSPECTOR_PATH, "/dashboard/activity?panel=traffic");
    assert.equal(buildObserveTrafficInspectorPath(), EPIC20_TRAFFIC_INSPECTOR_PATH);
    assert.equal(buildObserveTrafficPanelPath(), EPIC20_TRAFFIC_INSPECTOR_PATH);
    assert.equal(buildObserveOperationalPanelPath("traffic"), EPIC20_TRAFFIC_INSPECTOR_PATH);
    assert.equal(OBSERVE_TRAFFIC_PANEL, "traffic");
  });

  it("uses panel= only — never pollutes ObserveSource / source=traffic", () => {
    assert.equal(isObserveSource(OBSERVE_TRAFFIC_PANEL), false);
    assert.ok(!(OBSERVE_SOURCES as readonly string[]).includes("traffic"));
    assert.equal(isObserveOperationalPanel("traffic"), true);
    assert.ok((OBSERVE_OPERATIONAL_PANELS as readonly string[]).includes("traffic"));
    assert.ok(!EPIC20_TRAFFIC_INSPECTOR_PATH.includes("source=traffic"));
    assert.ok(EPIC20_TRAFFIC_INSPECTOR_PATH.includes("panel=traffic"));
  });

  it("Traffic is NOT an Operations topbar peer id", () => {
    assert.equal(isOperationsTopbarId("traffic"), false);
    assert.equal(isOperationsTopbarId("traffic-inspector"), false);
    assert.ok(!(OPERATIONS_TOPBAR_IDS as readonly string[]).includes("traffic"));
    assert.ok(!(OPERATIONS_TOPBAR_IDS as readonly string[]).includes("traffic-inspector"));
  });
});

describe("0098 — Observe topbar peer + single chrome strip", () => {
  it("ObserveHubSubnav includes traffic peer at frozen path", () => {
    const src = readSrc(OBSERVE_SUBNAV);
    assert.ok(src.includes('id: "traffic"') || src.includes("id: 'traffic'"));
    assert.ok(
      src.includes("buildObserveTrafficInspectorPath") ||
        src.includes("panel=traffic") ||
        src.includes('panel: "traffic"'),
      "subnav must link via frozen Traffic builder/path"
    );
    assert.ok(src.includes("network_check") || src.includes("trafficInspector"));
    // Exactly one Observe hub strip component definition
    const navMounts = src.match(/data-observe-hub-subnav/g) ?? [];
    assert.equal(navMounts.length, 1, "single Observe hub subnav shell attribute");
  });

  it("ObserveHubClient mounts TrafficInspector under panel=traffic with one subnav", () => {
    const src = readSrc(OBSERVE_HUB_CLIENT);
    assert.ok(src.includes("TrafficInspectorPageClient"), "must mount Traffic Inspector client");
    assert.ok(
      src.includes('case "traffic"') || src.includes("=== \"traffic\"") || src.includes("=== 'traffic'"),
      "must dispatch traffic operational panel"
    );
    const mounts = src.match(/<ObserveHubSubnav\b/g) ?? [];
    assert.equal(mounts.length, 1, "activity hub: exactly one ObserveHubSubnav");
    assert.ok(!src.includes("OperationsTopbar"), "must not stack Ops topbar on Observe");
    assert.ok(!src.includes("PageTabBar"), "must not remount Analytics PageTabBar");
  });

  it("does not add primary sidebar leaf for traffic-inspector", () => {
    assert.ok(!(PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes("traffic-inspector"));
    assert.ok(!(PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes("traffic"));
    assert.ok(
      !PRIMARY_SIDEBAR_ITEMS.some(
        (i) => i.id === "traffic-inspector" || i.id === "traffic" || i.href?.includes("traffic-inspector")
      )
    );
    assert.ok((EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS as readonly string[]).includes("traffic-inspector"));
  });
});

describe("0098 — legacy tools path redirects to Observe Traffic", () => {
  it("matrix row from tools/traffic-inspector → frozen Observe path", () => {
    const row = OPERATIONS_REDIRECT_MATRIX.find(
      (e) => e.from === "/dashboard/tools/traffic-inspector"
    );
    assert.ok(row, "matrix must document traffic-inspector redirect");
    assert.equal(row!.hub, "observe");
    assert.equal(row!.ownerTask, "0098");
    assert.equal(row!.to, buildObserveTrafficInspectorPath());
    assert.equal(row!.to, EPIC20_TRAFFIC_INSPECTOR_PATH);
  });

  it("legacy page.tsx server-redirects via buildObserveTrafficInspectorPath", () => {
    const src = readSrc(TRAFFIC_LEGACY_PAGE);
    assert.ok(src.includes("redirect") || src.includes("permanentRedirect"));
    assert.ok(
      src.includes("buildObserveTrafficInspectorPath") ||
        src.includes("EPIC20_TRAFFIC_INSPECTOR_PATH") ||
        src.includes("panel=traffic"),
      "legacy page must target frozen Observe Traffic path"
    );
    assert.ok(
      !src.includes("<TrafficInspectorPageClient"),
      "legacy route must not dual-host inspector UI (redirect only)"
    );
  });
});

describe("0098 — Ops hub no longer presents Traffic as Integrations destination", () => {
  it("removes traffic-inspector from OPERATIONS_HUB_HREFS / groups", () => {
    assert.equal(
      OPERATIONS_HUB_HREFS.includes("/dashboard/tools/traffic-inspector"),
      false,
      "Ops hub must not discover legacy traffic-inspector path"
    );
    assert.equal(
      OPERATIONS_HUB_HREFS.includes(EPIC20_TRAFFIC_INSPECTOR_PATH),
      false,
      "Ops hub must not re-home Traffic under Operations discovery cards"
    );
    for (const group of OPERATIONS_HUB_GROUPS) {
      for (const link of group.links) {
        assert.notEqual(link.id, "traffic-inspector");
        assert.notEqual(link.id, "traffic");
        assert.ok(!link.href.includes("traffic-inspector"));
        assert.ok(!link.href.includes("panel=traffic"));
      }
    }
  });
});

describe("0098 — sidebar Observe active on Traffic paths", () => {
  it("aliases legacy tools/traffic-inspector → activity (Observe)", () => {
    const alias = SIDEBAR_ACTIVE_HUB_ALIASES.find(
      (a) => a.pathPrefix === "/dashboard/tools/traffic-inspector"
    );
    assert.ok(alias, "must register traffic-inspector hub alias");
    assert.equal(alias!.primaryLeafId, "activity");
    assert.equal(alias!.primaryHref, "/dashboard/activity");

    assert.deepEqual(resolveSidebarHubAlias("/dashboard/tools/traffic-inspector"), {
      primaryLeafId: "activity",
      primaryHref: "/dashboard/activity",
    });
  });

  it("getActiveSidebarHref lights Observe for Traffic destinations", () => {
    assert.equal(
      getActiveSidebarHref("/dashboard/tools/traffic-inspector", [...PRIMARY_ITEMS]),
      "/dashboard/activity"
    );
    // Canonical path is under activity prefix — lights Observe without alias
    assert.equal(
      getActiveSidebarHref("/dashboard/activity", [...PRIMARY_ITEMS]),
      "/dashboard/activity"
    );
    assert.notEqual(
      getActiveSidebarHref("/dashboard/tools/traffic-inspector", [...PRIMARY_ITEMS]),
      "/operations"
    );
  });
});

describe("0098 — API local-only / spawn-capable unchanged", () => {
  it("keeps /api/tools/traffic-inspector/ in spawn-capable + route guard sources", () => {
    const spawn = readSrc(SPAWN_PREFIXES);
    const guard = readSrc(ROUTE_GUARD);
    assert.ok(spawn.includes("/api/tools/traffic-inspector/"));
    assert.ok(guard.includes("/api/tools/traffic-inspector/"));
  });
});
