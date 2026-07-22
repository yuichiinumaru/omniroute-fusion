/**
 * Task 0091 / EPIC-20 T20-F — Cloud Agents single-scroll under Operations.
 * Order Tasks → Settings → Agents; no tab chrome; about bottom collapsed;
 * compact agent rows; legacy redirect via 0086 builder; anti-phantom topbar ≤1;
 * no-new-leaf for cloud-agents.
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
  OPERATIONS_REDIRECT_MATRIX,
  buildOperationsPath,
  type Epic20RedirectEntry,
} from "../../../src/shared/constants/epic20Operations";
import {
  getActiveSidebarHref,
} from "../../../src/shared/utils/sidebarRouteMatch";

const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const CLIENT =
  "src/app/(dashboard)/operations/cloud-agents/CloudAgentsPageClient.tsx";
const CANONICAL_PAGE = "src/app/(dashboard)/operations/cloud-agents/page.tsx";
const LEGACY_PAGE = "src/app/(dashboard)/dashboard/cloud-agents/page.tsx";
const OPS_LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const SEGMENT_PAGE = "src/app/(dashboard)/operations/[segment]/page.tsx";

const PRIMARY_ITEMS = [
  { id: "home", href: "/home", exact: true },
  { id: "providers", href: "/dashboard/providers" },
  { id: "combos", href: "/dashboard/combos" },
  { id: "activity", href: "/dashboard/activity" },
  { id: "operations", href: "/operations" },
  { id: "settings-general", href: "/dashboard/settings/general" },
  { id: "docs", href: "/docs", external: true },
] as const;

describe("0091 — route tree + 0086 redirect matrix", () => {
  it("creates canonical /operations/cloud-agents page + client", () => {
    assert.equal(existsSync(join(ROOT, CLIENT)), true, `missing ${CLIENT}`);
    assert.equal(existsSync(join(ROOT, CANONICAL_PAGE)), true, `missing ${CANONICAL_PAGE}`);
    const page = read(CANONICAL_PAGE);
    assert.ok(page.includes("CloudAgentsPageClient"));
    assert.equal(page.includes("PageTabBar"), false);
    assert.equal(page.includes("OperationsTopbar"), false, "content must not re-mount Ops topbar");
  });

  it("matrix row owner 0091: /dashboard/cloud-agents → buildOperationsPath(cloud-agents)", () => {
    const row = OPERATIONS_REDIRECT_MATRIX.find(
      (e: Epic20RedirectEntry) => e.from === "/dashboard/cloud-agents"
    );
    assert.ok(row, "missing matrix row for /dashboard/cloud-agents");
    assert.equal(row!.ownerTask, "0091");
    assert.equal(row!.hub, "operations");
    assert.equal(row!.to, buildOperationsPath("cloud-agents"));
    assert.equal(row!.to, "/operations/cloud-agents");
  });

  it("legacy /dashboard/cloud-agents redirects via buildOperationsPath (not ad-hoc string)", () => {
    const page = read(LEGACY_PAGE);
    assert.ok(page.includes("redirect("), "legacy page must redirect");
    assert.ok(
      page.includes("buildOperationsPath"),
      "redirect must use 0086 builder"
    );
    assert.ok(page.includes('"cloud-agents"') || page.includes("'cloud-agents'"));
    assert.equal(
      page.includes("CloudAgentsPageClient") || page.includes("activeTab"),
      false,
      "legacy page must be redirect shell only (no product UI)"
    );
  });
});

describe("0091 — single-scroll order Tasks → Settings → Agents", () => {
  it("source-order data-section markers: tasks then settings then agents", () => {
    const src = read(CLIENT);
    const tasks = src.indexOf('data-section="tasks"');
    const settings = src.indexOf('data-section="settings"');
    const agents = src.indexOf('data-section="agents"');
    assert.ok(tasks >= 0, "tasks section marker required");
    assert.ok(settings >= 0, "settings section marker required");
    assert.ok(agents >= 0, "agents section marker required");
    assert.ok(tasks < settings, "Tasks must appear before Settings");
    assert.ok(settings < agents, "Settings must appear before Agents");
  });

  it("about/explainer is last section with Collapsible defaultOpen=false", () => {
    const src = read(CLIENT);
    const agents = src.indexOf('data-section="agents"');
    const about = src.indexOf('data-section="about"');
    assert.ok(about >= 0, "about section marker required");
    assert.ok(about > agents, "about must be after agents (page bottom)");
    assert.ok(src.includes("Collapsible"), "must wrap about in Collapsible");
    assert.ok(
      /defaultOpen=\{false\}/.test(src),
      "about Collapsible must default collapsed"
    );
    // About must not sit at the top before tasks
    const tasks = src.indexOf('data-section="tasks"');
    assert.ok(about > tasks, "about must not precede tasks");
  });

  it("does not mount Tasks/Agents/Settings tab strip (no activeTab chrome)", () => {
    const src = read(CLIENT);
    assert.equal(src.includes("activeTab"), false, "activeTab state must be removed");
    assert.equal(src.includes("setActiveTab"), false);
    assert.equal(src.includes("border-b-2"), false, "tab underline strip must be gone");
    assert.equal(
      /data-testid=["']cloud-agents-tab/.test(src),
      false,
      "no tab testids"
    );
    // Conditional tab panels must not gate primary content
    assert.equal(src.includes('activeTab === "tasks"'), false);
    assert.equal(src.includes('activeTab === "agents"'), false);
    assert.equal(src.includes('activeTab === "settings"'), false);
  });
});

describe("0091 — compact agent cards (provider deep-link density)", () => {
  it("uses compact row density, not hero marketing cards", () => {
    const src = read(CLIENT);
    assert.ok(src.includes('data-agent-card-density="compact"'));
    assert.ok(src.includes('data-agent-card="compact"'));
    assert.ok(src.includes("cloud-agent-compact-row"));
    // No large centered hero icons (text-[32px] was the old card chrome)
    assert.equal(
      src.includes("text-[32px]"),
      false,
      "hero-size icons must not appear on provider-link-only agent cards"
    );
    assert.equal(
      src.includes("items-center text-center"),
      false,
      "centered marketing card layout must be gone"
    );
    // Configure still deep-links to Providers cloudagent section
    assert.ok(src.includes("section=cloudagent"));
  });
});

describe("0091 — anti-phantom chrome + no-new-leaf", () => {
  it("Cloud Agents content never mounts second PageTabBar / Ops topbar", () => {
    for (const rel of [CLIENT, CANONICAL_PAGE]) {
      const src = read(rel);
      assert.equal(
        /import\s+PageTabBar\b/.test(src) || /<PageTabBar\b/.test(src),
        false,
        `${rel} must not stack PageTabBar`
      );
      assert.equal(
        /import\s+OperationsTopbar\b/.test(src) || /<OperationsTopbar\b/.test(src),
        false,
        `${rel} must not re-mount OperationsTopbar (layout owns chrome)`
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
    }
  });

  it("Ops layout remains sole OperationsTopbar mount (≤1)", () => {
    const layout = read(OPS_LAYOUT);
    const mounts = layout.match(/<OperationsTopbar\b/g) ?? [];
    assert.equal(mounts.length, 1, "layout must render OperationsTopbar exactly once");
    // Content files under cloud-agents do not add another
    const clientMounts = (read(CLIENT).match(/<OperationsTopbar\b/g) ?? []).length;
    assert.equal(clientMounts, 0);
  });

  it("no-new-leaf: cloud-agents is not a PRIMARY_SIDEBAR peer", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("cloud-agents"), false);
    assert.equal(
      PRIMARY_SIDEBAR_ITEMS.some((i) => i.id === "cloud-agents"),
      false
    );
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
  });

  it("sidebar lights Operations for /operations/cloud-agents", () => {
    assert.equal(
      getActiveSidebarHref("/operations/cloud-agents", [...PRIMARY_ITEMS]),
      "/operations"
    );
  });

  it("segment page can mount CloudAgentsPageClient for cloud-agents id", () => {
    const src = read(SEGMENT_PAGE);
    assert.ok(
      src.includes("CloudAgentsPageClient") || existsSync(join(ROOT, CANONICAL_PAGE)),
      "cloud-agents must be wired via static route and/or segment branch"
    );
  });
});

describe("0091 — functional surface preserved (CRUD helpers still present)", () => {
  it("keeps create/list/cancel/delete task API paths", () => {
    const src = read(CLIENT);
    assert.ok(src.includes("/api/v1/agents/tasks"));
    assert.ok(src.includes("handleCreateTask"));
    assert.ok(src.includes("handleCancelTask"));
    assert.ok(src.includes("handleDeleteTask"));
    assert.ok(src.includes("handleApprovePlan"));
    assert.ok(src.includes("/api/v1/agents/health"));
    // Health fetched on mount, not tab-gated
    assert.equal(src.includes('activeTab === "agents"'), false);
  });
});

describe("0091 — Header + hub self-evident titles/paths (path-to-100)", () => {
  const HEADER = "src/shared/components/Header.tsx";

  it("Header deep meta matches /operations/cloud-agents before catch-all", () => {
    const src = read(HEADER);
    assert.ok(
      src.includes('matchOpsPeerPath("cloud-agents")') ||
        src.includes("/operations/cloud-agents") ||
        src.includes('"cloud-agents"'),
      "must match canonical cloud-agents peer"
    );
    // 0100: hub catch-all is root-only (no p.startsWith("/operations/") shadow)
    assert.equal(
      /match:\s*\([^)]*\)\s*=>[\s\S]{0,200}?p\.startsWith\(\s*["']\/operations\/["']\s*\)/.test(
        src
      ),
      false
    );
    assert.ok(
      src.includes('titleFallback: "Cloud Agents"') ||
        src.includes('OPERATIONS_TOPBAR_LABELS["cloud-agents"]')
    );
  });

  it("operations hub cloud-agents card targets buildOperationsPath(cloud-agents)", () => {
    const hub = read("src/shared/constants/operationsHub.ts");
    assert.ok(hub.includes('buildOperationsPath("cloud-agents")'));
    assert.equal(
      hub.includes('href: "/dashboard/cloud-agents"'),
      false,
      "hub must not deep-link only legacy path"
    );
  });
});
