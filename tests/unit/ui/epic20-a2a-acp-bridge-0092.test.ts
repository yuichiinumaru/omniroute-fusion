/**
 * Task 0092 / EPIC-20 T20-G — A2A/ACP Bridge collapsible stack under Ops peer.
 * Order: Agent Bridge → A2A Server → ACP Agents; explainers bottom collapsed;
 * three legacy redirects; anti-phantom ≤1 Ops topbar; no-new-leaf.
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
  EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS,
  EPIC20_FORBIDDEN_PROTOCOL_SUBTOPBAR_IDS,
  OPERATIONS_REDIRECT_MATRIX,
  OPERATIONS_TOPBAR_IDS,
  OPERATIONS_TOPBAR_LABELS,
  buildOperationsPath,
} from "../../../src/shared/constants/epic20Operations";
import { getActiveSidebarHref } from "../../../src/shared/utils/sidebarRouteMatch";
import { resolveOperationsTopbarActive } from "../../../src/app/(dashboard)/operations/OperationsTopbar";

const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

const STACK_CLIENT =
  "src/app/(dashboard)/operations/a2a-acp-bridge/A2aAcpBridgeStackClient.tsx";
const STACK_PAGE = "src/app/(dashboard)/operations/a2a-acp-bridge/A2aAcpBridgePage.tsx";
const LOAD_BRIDGE = "src/app/(dashboard)/operations/a2a-acp-bridge/loadAgentBridgeData.ts";
const SEGMENT_PAGE = "src/app/(dashboard)/operations/[segment]/page.tsx";
const OPS_LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const OPS_TOPBAR = "src/app/(dashboard)/operations/OperationsTopbar.tsx";

const LEGACY_PAGES = [
  {
    from: "/dashboard/tools/agent-bridge",
    page: "src/app/(dashboard)/dashboard/tools/agent-bridge/page.tsx",
    keepModule: "src/app/(dashboard)/dashboard/tools/agent-bridge/AgentBridgePageClient.tsx",
  },
  {
    from: "/dashboard/a2a",
    page: "src/app/(dashboard)/dashboard/a2a/page.tsx",
    keepModule: "src/app/(dashboard)/dashboard/a2a/A2APageClient.tsx",
  },
  {
    from: "/dashboard/acp-agents",
    page: "src/app/(dashboard)/dashboard/acp-agents/page.tsx",
    keepModule: "src/app/(dashboard)/dashboard/acp-agents/AcpAgentsPageClient.tsx",
  },
] as const;

const PRIMARY_ITEMS = [
  { id: "home", href: "/home", exact: true },
  { id: "providers", href: "/dashboard/providers" },
  { id: "combos", href: "/dashboard/combos" },
  { id: "activity", href: "/dashboard/activity" },
  { id: "operations", href: "/operations" },
  { id: "settings-general", href: "/dashboard/settings/general" },
  { id: "docs", href: "/docs", external: true },
] as const;

const SECTION_ORDER = ["agent-bridge", "a2a-server", "acp-agents"] as const;

describe("0092 — A2A/ACP Bridge peer path + Ops topbar SSoT", () => {
  it("a2a-acp-bridge is Operations topbar peer #5 with frozen label", () => {
    assert.equal(OPERATIONS_TOPBAR_IDS[4], "a2a-acp-bridge");
    assert.equal(OPERATIONS_TOPBAR_LABELS["a2a-acp-bridge"], "A2A/ACP Bridge");
    assert.equal(buildOperationsPath("a2a-acp-bridge"), "/operations/a2a-acp-bridge");
  });

  it("resolveOperationsTopbarActive lights a2a-acp-bridge on canonical path", () => {
    assert.equal(
      resolveOperationsTopbarActive(buildOperationsPath("a2a-acp-bridge")),
      "a2a-acp-bridge"
    );
    assert.equal(
      resolveOperationsTopbarActive("/operations/a2a-acp-bridge"),
      "a2a-acp-bridge"
    );
  });

  it("stack route modules exist", () => {
    for (const rel of [STACK_CLIENT, STACK_PAGE, LOAD_BRIDGE, SEGMENT_PAGE]) {
      assert.equal(exists(rel), true, `missing ${rel}`);
    }
  });
});

describe("0092 — collapsible stack order + defaultOpen policy", () => {
  it("stack renders three work sections in Agent Bridge → A2A → ACP order", () => {
    const src = read(STACK_CLIENT);
    assert.ok(src.includes('data-testid="a2a-acp-bridge-stack"'));
    assert.ok(src.includes('data-operations-page="a2a-acp-bridge"'));

    const indices = SECTION_ORDER.map((id) => {
      const needle = `data-section="${id}"`;
      const idx = src.indexOf(needle);
      assert.ok(idx >= 0, `missing data-section=${id}`);
      return idx;
    });
    assert.ok(indices[0]! < indices[1]!, "agent-bridge before a2a-server");
    assert.ok(indices[1]! < indices[2]!, "a2a-server before acp-agents");
  });

  it("defaultOpen: three work sections open; explainers collapsed", () => {
    const src = read(STACK_CLIENT);
    assert.ok(src.includes("A2A_ACP_BRIDGE_DEFAULT_OPEN"));
    // Frozen policy object in stack client source
    assert.match(src, /"agent-bridge":\s*true/);
    assert.match(src, /"a2a-server":\s*true/);
    assert.match(src, /"acp-agents":\s*true/);
    assert.match(src, /explainers:\s*false/);
    assert.ok(src.includes('data-section="explainers"'));
    assert.ok(src.includes('data-testid="a2a-acp-bridge-explainers"'));
    // Explainers after work sections
    const explainerIdx = src.indexOf('data-section="explainers"');
    const lastWork = src.indexOf('data-section="acp-agents"');
    assert.ok(explainerIdx > lastWork, "explainers collapsible is after ACP section");
  });

  it("imports existing clients (no blank page / no second topbar)", () => {
    const src = read(STACK_CLIENT);
    assert.ok(src.includes("AgentBridgePageClient"));
    assert.ok(src.includes("A2APageClient"));
    assert.ok(src.includes("AcpAgentsPageClient"));
    assert.ok(src.includes("Collapsible"));
    assert.ok(src.includes("embedded"));
    assert.ok(src.includes("A2AConceptIntro") || src.includes("AcpAgentsConceptCards"));
    assert.equal(src.includes("OperationsTopbar"), false);
    assert.equal(src.includes("PageTabBar"), false);
    assert.equal(src.includes("CostsSubnav"), false);
  });

  it("segment page mounts A2aAcpBridgePage for a2a-acp-bridge", () => {
    const src = read(SEGMENT_PAGE);
    assert.ok(src.includes("A2aAcpBridgePage"));
    assert.ok(src.includes('id === "a2a-acp-bridge"') || src.includes("id === 'a2a-acp-bridge'"));
    assert.equal(src.includes("<OperationsTopbar"), false);
  });
});

describe("0092 — legacy redirects (three URLs → canonical builder)", () => {
  it("0086 matrix rows ownerTask 0092 map to buildOperationsPath(a2a-acp-bridge)", () => {
    const expectedFrom = LEGACY_PAGES.map((l) => l.from);
    const rows = OPERATIONS_REDIRECT_MATRIX.filter((e) => e.ownerTask === "0092");
    assert.equal(rows.length, 3, "exactly three 0092 matrix rows");
    for (const from of expectedFrom) {
      const row = rows.find((r) => r.from === from);
      assert.ok(row, `matrix missing ${from}`);
      assert.equal(row!.to, buildOperationsPath("a2a-acp-bridge"));
      assert.equal(row!.to, "/operations/a2a-acp-bridge");
      assert.equal(row!.hub, "operations");
    }
  });

  it("legacy pages are server redirect shells using epic20Operations builder", () => {
    for (const { page, keepModule } of LEGACY_PAGES) {
      const src = read(page);
      assert.equal(src.includes('"use client"'), false, `${page} must be server redirect`);
      assert.ok(src.includes("redirect"), `${page} must call redirect()`);
      assert.ok(
        src.includes('from "next/navigation"') || src.includes("from 'next/navigation'"),
        `${page} must import redirect from next/navigation`
      );
      assert.ok(src.includes("epic20Operations"), `${page} must use epic20Operations`);
      assert.ok(
        src.includes('buildOperationsPath("a2a-acp-bridge")') ||
          src.includes("buildOperationsPath('a2a-acp-bridge')"),
        `${page} must redirect via buildOperationsPath("a2a-acp-bridge")`
      );
      assert.equal(
        /import\s+.*AgentBridgePageClient|import\s+.*A2APageClient|import\s+.*AcpAgentsPageClient|import\s+.*A2ADashboard/.test(
          src
        ),
        false,
        `${page} must not import UI clients (redirect only)`
      );
      assert.equal(
        /<AgentBridgePageClient\b|<A2APageClient\b|<AcpAgentsPageClient\b|<A2ADashboard\b/.test(src),
        false,
        `${page} must not mount UI clients (redirect only)`
      );
      assert.equal(exists(keepModule), true, `implementation module must remain: ${keepModule}`);
    }
  });
});

describe("0092 — anti-phantom chrome (≤1 Ops topbar)", () => {
  it("Ops layout is sole OperationsTopbar mount; stack never re-mounts hub chrome", () => {
    const layoutMounts = (read(OPS_LAYOUT).match(/<OperationsTopbar\b/g) ?? []).length;
    assert.equal(layoutMounts, 1, "layout must mount OperationsTopbar exactly once");

    for (const rel of [STACK_CLIENT, STACK_PAGE, SEGMENT_PAGE, LOAD_BRIDGE, ...LEGACY_PAGES.map((l) => l.page)]) {
      const src = read(rel);
      assert.equal(
        (src.match(/<OperationsTopbar\b/g) ?? []).length,
        0,
        `${rel} must not re-mount OperationsTopbar`
      );
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
    }

    // Topbar source still lists peer via SSoT only
    const topbar = read(OPS_TOPBAR);
    assert.ok(topbar.includes("a2a-acp-bridge"));
    assert.ok(topbar.includes("OPERATIONS_TOPBAR_IDS"));
  });

  it("stack does not reintroduce Endpoint dual protocol strip as L1 chrome", () => {
    const stack = read(STACK_CLIENT);
    assert.equal(stack.includes("EndpointPageClient"), false);
    assert.equal(stack.includes("ENDPOINT_TABS"), false);
    // Forbidden protocol sub-topbar ids stay forbidden
    assert.deepEqual([...EPIC20_FORBIDDEN_PROTOCOL_SUBTOPBAR_IDS], ["mcp", "a2a"]);
  });
});

describe("0092 — no-new-leaf (a2a / acp-agents / agent-bridge not primary)", () => {
  it("PRIMARY_SIDEBAR_ITEMS has no a2a / acp-agents / agent-bridge leaves", () => {
    const ids = PRIMARY_SIDEBAR_ITEMS.map((i) => i.id);
    for (const forbidden of ["a2a", "acp-agents", "agent-bridge", "a2a-acp-bridge"]) {
      assert.equal(ids.includes(forbidden), false, `${forbidden} must not be primary leaf`);
      assert.equal(
        PRIMARY_SIDEBAR_ITEM_IDS.includes(forbidden as (typeof PRIMARY_SIDEBAR_ITEM_IDS)[number]),
        false,
        `${forbidden} must not be in PRIMARY_SIDEBAR_ITEM_IDS`
      );
    }
    assert.equal(ids.includes("operations"), true, "Operations leaf remains");
  });

  it("a2a-acp-bridge remains in EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS", () => {
    assert.ok(EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS.includes("a2a-acp-bridge"));
  });

  it("sidebar active for /operations/a2a-acp-bridge is Operations", () => {
    assert.equal(
      getActiveSidebarHref(buildOperationsPath("a2a-acp-bridge"), [...PRIMARY_ITEMS]),
      "/operations"
    );
  });
});

describe("0092 — Header + hub self-evident titles/paths (path-to-100)", () => {
  const HEADER = "src/shared/components/Header.tsx";
  const HUB = "src/shared/constants/operationsHub.ts";

  it("Header deep meta matches /operations/a2a-acp-bridge before catch-all", () => {
    const src = read(HEADER);
    assert.ok(
      src.includes('matchOpsPeerPath("a2a-acp-bridge")') ||
        src.includes("/operations/a2a-acp-bridge") ||
        src.includes('"a2a-acp-bridge"')
    );
    assert.equal(
      /match:\s*\([^)]*\)\s*=>[\s\S]{0,200}?p\.startsWith\(\s*["']\/operations\/["']\s*\)/.test(
        src
      ),
      false,
      "a2a-acp-bridge must not be shadowed by /operations/* catch-all"
    );
    assert.ok(
      src.includes('titleFallback: "A2A/ACP Bridge"') ||
        src.includes('OPERATIONS_TOPBAR_LABELS["a2a-acp-bridge"]')
    );
    assert.ok(src.includes('titleKey: "a2aAcpBridge"'));
  });

  it("stack sections expose hash anchors for hub deep-links", () => {
    const src = read(STACK_CLIENT);
    assert.ok(src.includes('id="agent-bridge"'));
    assert.ok(src.includes('id="a2a-server"'));
    assert.ok(src.includes('id="acp-agents"'));
  });

  it("hub agent-bridge + acp-agents cards target fused peer (with section hash)", () => {
    const hub = read(HUB);
    assert.ok(hub.includes('buildOperationsPath("a2a-acp-bridge")'));
    assert.ok(hub.includes("#agent-bridge") || hub.includes("#acp-agents"));
    assert.equal(hub.includes('href: "/dashboard/acp-agents"'), false);
    assert.equal(hub.includes('href: "/dashboard/tools/agent-bridge"'), false);
  });
});
