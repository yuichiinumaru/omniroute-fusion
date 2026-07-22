/**
 * Task 0087 / EPIC-20 T20-B — Operations shell: single topbar host on `/operations/*`.
 * Anti-phantom: mount count ≤ 1; peers from 0086 SSoT only; sidebar active for /operations/*.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OPERATIONS_DEFAULT_TOPBAR_ID,
  OPERATIONS_HUB_PATH,
  OPERATIONS_TOPBAR_IDS,
  OPERATIONS_TOPBAR_LABELS,
  buildOperationsHubPath,
  buildOperationsPath,
  type OperationsTopbarId,
} from "../../../src/shared/constants/epic20Operations";
import {
  getActiveSidebarHref,
  resolveSidebarHubAlias,
} from "../../../src/shared/utils/sidebarRouteMatch";
import { resolveOperationsTopbarActive } from "../../../src/app/(dashboard)/operations/OperationsTopbar";

const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const TOPBAR = "src/app/(dashboard)/operations/OperationsTopbar.tsx";
const HUB_PAGE = "src/app/(dashboard)/operations/page.tsx";
const SEGMENT_PAGE = "src/app/(dashboard)/operations/[segment]/page.tsx";
const LEGACY_PAGE = "src/app/(dashboard)/dashboard/operations/page.tsx";
const HUB_CLIENT = "src/app/(dashboard)/operations/OperationsHubClient.tsx";

const PRIMARY_ITEMS = [
  { id: "home", href: "/home", exact: true },
  { id: "providers", href: "/dashboard/providers" },
  { id: "combos", href: "/dashboard/combos" },
  { id: "activity", href: "/dashboard/activity" },
  { id: "operations", href: "/operations" },
  { id: "settings-general", href: "/dashboard/settings/general" },
  { id: "docs", href: "/docs", external: true },
] as const;

describe("EPIC-20 Operations shell route tree (0087)", () => {
  it("creates /operations layout + hub + dynamic segment pages", () => {
    for (const rel of [LAYOUT, TOPBAR, HUB_PAGE, SEGMENT_PAGE, LEGACY_PAGE, HUB_CLIENT]) {
      assert.equal(existsSync(join(ROOT, rel)), true, `missing ${rel}`);
    }
  });

  it("layout mounts OperationsTopbar exactly once (shell contract)", () => {
    const layout = read(LAYOUT);
    assert.ok(layout.includes("OperationsTopbar"), "layout must import/mount OperationsTopbar");
    const mounts = layout.match(/<OperationsTopbar\b/g) ?? [];
    assert.equal(mounts.length, 1, "layout must render <OperationsTopbar /> exactly once");
    assert.ok(layout.includes("data-operations-shell"), "shell marker for tests");
    // Layout must not stack PageTabBar / CostsSubnav as hub chrome
    assert.equal(layout.includes("PageTabBar"), false, "layout must not mount PageTabBar");
    assert.equal(layout.includes("CostsSubnav"), false, "layout must not mount CostsSubnav");
  });

  it("legacy /dashboard/operations redirects via buildOperationsHubPath", () => {
    const page = read(LEGACY_PAGE);
    assert.ok(page.includes("redirect("), "legacy page must redirect");
    assert.ok(
      page.includes("buildOperationsHubPath"),
      "redirect must use 0086 builder (not ad-hoc string)"
    );
    assert.equal(
      page.includes("OperationsHubClient"),
      false,
      "legacy page must not still render hub client (redirect shell only)"
    );
  });
});

describe("OperationsTopbar peers from 0086 SSoT only", () => {
  it("source lists all 10 peers with CoreMCP label (not MCP Server)", () => {
    const src = read(TOPBAR);
    assert.ok(src.includes("OPERATIONS_TOPBAR_IDS"));
    assert.ok(src.includes("OPERATIONS_TOPBAR_LABELS"));
    assert.ok(src.includes("buildOperationsPath"));
    assert.ok(src.includes("data-operations-topbar"));
    assert.ok(src.includes('data-testid="operations-topbar"'));
    // Labels come from SSoT — CoreMCP rename frozen in 0086
    assert.equal(OPERATIONS_TOPBAR_LABELS["core-mcp"], "CoreMCP");
    assert.notEqual(OPERATIONS_TOPBAR_LABELS["core-mcp"], "MCP Server");
  });

  it("exactly 10 peer links via buildOperationsPath", () => {
    assert.equal(OPERATIONS_TOPBAR_IDS.length, 10);
    for (const id of OPERATIONS_TOPBAR_IDS) {
      assert.equal(buildOperationsPath(id), `/operations/${id}`);
    }
  });

  it("resolveOperationsTopbarActive: hub root → default endpoints; peers map segment", () => {
    assert.equal(resolveOperationsTopbarActive("/operations"), OPERATIONS_DEFAULT_TOPBAR_ID);
    assert.equal(resolveOperationsTopbarActive("/operations/"), OPERATIONS_DEFAULT_TOPBAR_ID);
    assert.equal(resolveOperationsTopbarActive(null), OPERATIONS_DEFAULT_TOPBAR_ID);

    for (const id of OPERATIONS_TOPBAR_IDS) {
      assert.equal(
        resolveOperationsTopbarActive(buildOperationsPath(id)),
        id,
        `active for ${id}`
      );
    }
    assert.equal(
      resolveOperationsTopbarActive("/operations/not-a-peer"),
      OPERATIONS_DEFAULT_TOPBAR_ID
    );
  });

  it("segment page validates ids with isOperationsTopbarId and stubs non-default peers", () => {
    const src = read(SEGMENT_PAGE);
    assert.ok(src.includes("isOperationsTopbarId"));
    assert.ok(src.includes("notFound"));
    assert.ok(src.includes("OperationsSegmentPlaceholder") || src.includes("OperationsHubClient"));
    // Placeholders note owning tasks for fusions
    const placeholder = read(
      "src/app/(dashboard)/operations/OperationsSegmentPlaceholder.tsx"
    );
    assert.ok(placeholder.includes("0088"));
    assert.ok(placeholder.includes("0089"));
    assert.ok(placeholder.includes("0090"));
  });
});

describe("Anti-phantom chrome (one topbar only)", () => {
  it("shell pages never mount dual OperationsTopbar + PageTabBar hub strip", () => {
    for (const rel of [LAYOUT, HUB_PAGE, SEGMENT_PAGE, HUB_CLIENT, TOPBAR]) {
      const src = read(rel);
      assert.equal(
        /import\s+PageTabBar\b/.test(src) || /<PageTabBar\b/.test(src),
        false,
        `${rel} must not stack PageTabBar`
      );
      assert.equal(
        /import\s+CostsSubnav\b/.test(src) || /<CostsSubnav\b/.test(src),
        false,
        `${rel} must not stack CostsSubnav`
      );
      assert.equal(
        /import\s+DashboardTopbar\b/.test(src) || /<DashboardTopbar\b/.test(src),
        false,
        `${rel} must not mount DashboardTopbar`
      );
      assert.equal(
        /import\s+ObserveHubSubnav\b/.test(src) || /<ObserveHubSubnav\b/.test(src),
        false,
        `${rel} must not mount ObserveHubSubnav`
      );
    }
  });

  it("chrome matrix: layout is the sole OperationsTopbar mount site under operations/", () => {
    // Grep-style: only layout.tsx should render <OperationsTopbar
    const pages = [HUB_PAGE, SEGMENT_PAGE, HUB_CLIENT];
    for (const rel of pages) {
      const mounts = (read(rel).match(/<OperationsTopbar\b/g) ?? []).length;
      assert.equal(
        mounts,
        0,
        `${rel} must not re-mount OperationsTopbar (layout owns chrome)`
      );
    }
    assert.equal((read(LAYOUT).match(/<OperationsTopbar\b/g) ?? []).length, 1);
  });

  it("hub cards are content under default peer — not a second topbar component", () => {
    const client = read(HUB_CLIENT);
    assert.ok(client.includes('data-testid="operations-hub"'));
    assert.ok(client.includes("OPERATIONS_HUB_GROUPS"));
    // Cards must not claim to be topbar chrome
    assert.equal(client.includes("data-operations-topbar"), false);
    assert.equal(client.includes("PageTabBar"), false);
  });
});

describe("Sidebar Operations leaf — single leaf, /operations active match", () => {
  it("PRIMARY leaf href is /operations; leaf count unchanged (no new leaves)", () => {
    const ops = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "operations");
    assert.ok(ops);
    assert.equal(ops.href, OPERATIONS_HUB_PATH);
    assert.equal(ops.href, buildOperationsHubPath());
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("operations"), true);
    // Forbidden EPIC-20 primary leaves
    for (const id of ["labs", "mcp", "endpoints", "testing", "media", "skills"] as const) {
      assert.equal(
        PRIMARY_SIDEBAR_ITEM_IDS.includes(id),
        false,
        `${id} must not become a primary leaf`
      );
    }
  });

  it("getActiveSidebarHref lights Operations for hub + all 10 peers", () => {
    assert.equal(
      getActiveSidebarHref("/operations", [...PRIMARY_ITEMS]),
      "/operations"
    );
    assert.equal(
      getActiveSidebarHref("/operations/endpoints", [...PRIMARY_ITEMS]),
      "/operations"
    );
    for (const id of OPERATIONS_TOPBAR_IDS as readonly OperationsTopbarId[]) {
      assert.equal(
        getActiveSidebarHref(buildOperationsPath(id), [...PRIMARY_ITEMS]),
        "/operations",
        `expected Operations active for ${id}`
      );
    }
  });

  it("legacy /dashboard/operations aliases to Operations primary href", () => {
    assert.deepEqual(resolveSidebarHubAlias("/dashboard/operations"), {
      primaryLeafId: "operations",
      primaryHref: "/operations",
    });
    assert.equal(
      getActiveSidebarHref("/dashboard/operations", [...PRIMARY_ITEMS]),
      "/operations"
    );
  });

  it("anti-phantom: /operations does not light combos/activity/providers/home", () => {
    const paths = ["/operations", "/operations/endpoints", "/operations/labs"];
    for (const path of paths) {
      const active = getActiveSidebarHref(path, [...PRIMARY_ITEMS]);
      assert.equal(active, "/operations");
      assert.notEqual(active, "/home");
      assert.notEqual(active, "/dashboard/combos");
      assert.notEqual(active, "/dashboard/activity");
      assert.notEqual(active, "/dashboard/providers");
    }
  });
});
