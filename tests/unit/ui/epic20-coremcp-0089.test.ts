/**
 * Task 0089 / EPIC-20 T20-D — CoreMCP peer at `/operations/core-mcp`.
 * Redirect legacy `/dashboard/mcp`, CoreMCP naming, single Ops topbar, no MetaMCP.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS,
  OPERATIONS_TOPBAR_IDS,
  OPERATIONS_TOPBAR_LABELS,
  OPERATIONS_REDIRECT_MATRIX,
  buildOperationsPath,
} from "../../../src/shared/constants/epic20Operations";
import {
  OPERATIONS_HUB_GROUPS,
  OPERATIONS_HUB_HREFS,
} from "../../../src/shared/constants/operationsHub";
import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import { resolveDeepHeaderTitleFallback } from "../../../src/shared/components/Header";

const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const CORE_MCP_PAGE = "src/app/(dashboard)/operations/core-mcp/page.tsx";
const CORE_MCP_CLIENT = "src/app/(dashboard)/operations/core-mcp/CoreMcpPageClient.tsx";
const LEGACY_MCP = "src/app/(dashboard)/dashboard/mcp/page.tsx";
const LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const TOPBAR = "src/app/(dashboard)/operations/OperationsTopbar.tsx";
const OPS_HUB = "src/shared/constants/operationsHub.ts";
const PALETTE = "src/shared/components/CommandPalette.tsx";
const HEADER = "src/shared/components/Header.tsx";
const EN_JSON = "src/i18n/messages/en.json";

describe("EPIC-20 CoreMCP route + redirect (0089)", () => {
  it("canonical page + client exist under /operations/core-mcp", () => {
    assert.equal(existsSync(join(ROOT, CORE_MCP_PAGE)), true);
    assert.equal(existsSync(join(ROOT, CORE_MCP_CLIENT)), true);
    const page = read(CORE_MCP_PAGE);
    assert.ok(page.includes("CoreMcpPageClient"));
    assert.equal(
      /import\s+OperationsTopbar\b/.test(page) || /<OperationsTopbar\b/.test(page),
      false,
      "page must not import/mount topbar"
    );
    assert.equal(page.includes("PageTabBar"), false);
  });

  it("legacy /dashboard/mcp redirects via buildOperationsPath('core-mcp')", () => {
    const page = read(LEGACY_MCP);
    assert.ok(page.includes("redirect("), "legacy page must redirect");
    assert.ok(
      page.includes("buildOperationsPath"),
      "redirect must use 0086 builder (not ad-hoc string)"
    );
    assert.ok(
      page.includes('"core-mcp"') || page.includes("'core-mcp'"),
      "redirect target must be core-mcp peer"
    );
    assert.equal(
      page.includes("CoreMcpPageClient") || page.includes("McpDashboardPage"),
      false,
      "legacy page must be redirect shell only"
    );
    assert.equal(buildOperationsPath("core-mcp"), "/operations/core-mcp");
  });

  it("matrix row freezes /dashboard/mcp → buildOperationsPath(core-mcp) owner 0089", () => {
    const row = OPERATIONS_REDIRECT_MATRIX.find((e) => e.from === "/dashboard/mcp");
    assert.ok(row);
    assert.equal(row.to, buildOperationsPath("core-mcp"));
    assert.equal(row.ownerTask, "0089");
    assert.equal(row.hub, "operations");
  });
});

describe("CoreMCP page body + functionality surface", () => {
  it("client reuses MCP dashboard + live counts + /api/mcp paths", () => {
    const src = read(CORE_MCP_CLIENT);
    assert.ok(src.includes("MCP_TOOL_COUNT"));
    assert.ok(src.includes("MCP_SCOPE_COUNT"));
    assert.ok(src.includes("MCP_TRANSPORT_COUNT"));
    assert.ok(src.includes("McpDashboardPage") || src.includes("MCPDashboard"));
    assert.ok(src.includes("/api/mcp/status"));
    assert.ok(src.includes("/api/mcp/sse"));
    assert.ok(src.includes("/api/mcp/stream"));
    // Technical flags stay mcp* — no accidental API rename
    assert.ok(src.includes("mcpEnabled"));
    assert.ok(src.includes("mcpTransport"));
    assert.doesNotMatch(src, /\/api\/core-mcp\//);
    assert.doesNotMatch(src, /tools:\s*37/);
  });

  it("exposes CoreMCP page title marker and operational toggle", () => {
    const src = read(CORE_MCP_CLIENT);
    assert.ok(src.includes('data-testid="coremcp-page"') || src.includes("data-coremcp-page"));
    assert.ok(src.includes("data-coremcp-title"));
    assert.ok(src.includes("ServiceToggle") || src.includes("toggleMcp"));
    // Brand from SSoT
    assert.ok(
      src.includes('OPERATIONS_TOPBAR_LABELS["core-mcp"]') ||
        src.includes("OPERATIONS_TOPBAR_LABELS['core-mcp']") ||
        src.includes("pageTitle") ||
        src.includes("CoreMCP")
    );
  });

  it("ServiceToggle + transport controls expose switch/pressed ARIA (path-to-100)", () => {
    const src = read(CORE_MCP_CLIENT);
    assert.ok(src.includes('role="switch"'));
    assert.ok(src.includes("aria-checked={enabled}"));
    assert.ok(src.includes("aria-label={"));
    assert.ok(src.includes("aria-pressed={value === opt.value}"));
    assert.ok(src.includes('type="button"'));
  });

  it("explainers are bottom collapsible default-collapsed (not open wall at top)", () => {
    const src = read(CORE_MCP_CLIENT);
    assert.ok(src.includes("Collapsible"), "must use Collapsible for prose explainers");
    assert.ok(
      src.includes("defaultOpen={false}") || src.includes("defaultOpen={ false }"),
      "explainers default collapsed"
    );
    // Explainer after dashboard body in source order (bottom of page tree)
    const explainerIdx = src.indexOf("data-coremcp-explainer");
    const titleIdx = src.indexOf("data-coremcp-title");
    const toggleIdx = src.indexOf("ServiceToggle") >= 0 ? src.indexOf("ServiceToggle") : titleIdx;
    assert.ok(explainerIdx > 0, "explainer marker present");
    assert.ok(titleIdx > 0 && titleIdx < explainerIdx, "title above explainer");
    assert.ok(toggleIdx > 0 && toggleIdx < explainerIdx, "controls above explainer");
    // mcpStep* body lives inside explainer region
    const stepIdx = src.indexOf("mcpStep1");
    assert.ok(stepIdx > explainerIdx, "how-to steps inside bottom explainer");
  });
});

describe("CoreMCP naming + hub / palette retarget", () => {
  it("topbar SSoT label is CoreMCP (not MCP Server)", () => {
    assert.equal(OPERATIONS_TOPBAR_LABELS["core-mcp"], "CoreMCP");
    assert.notEqual(OPERATIONS_TOPBAR_LABELS["core-mcp"], "MCP Server");
    assert.ok(OPERATIONS_TOPBAR_IDS.includes("core-mcp"));
  });

  it("operationsHub card href uses builder and CoreMCP label", () => {
    const mcpLink = OPERATIONS_HUB_GROUPS.flatMap((g) => g.links).find((l) => l.id === "mcp");
    assert.ok(mcpLink);
    assert.equal(mcpLink.href, buildOperationsPath("core-mcp"));
    assert.equal(mcpLink.label, "CoreMCP");
    assert.ok(OPERATIONS_HUB_HREFS.includes(buildOperationsPath("core-mcp")));
    assert.equal(OPERATIONS_HUB_HREFS.includes("/dashboard/mcp"), false);

    const hubSrc = read(OPS_HUB);
    assert.ok(hubSrc.includes("buildOperationsPath"));
    assert.ok(hubSrc.includes('"core-mcp"') || hubSrc.includes("'core-mcp'"));
  });

  it("CommandPalette MCP entry retargets to CoreMCP path", () => {
    const src = read(PALETTE);
    assert.ok(src.includes("buildOperationsPath"));
    assert.ok(src.includes('"core-mcp"') || src.includes("'core-mcp'"));
    assert.equal(src.includes('href: "/dashboard/mcp"'), false);
    assert.ok(src.includes("CoreMCP") || src.includes('safeTranslate("mcp"'));
  });

  it("Header deep meta uses CoreMCP for ops peer + legacy path", () => {
    const src = read(HEADER);
    assert.ok(src.includes("CoreMCP") || src.includes('OPERATIONS_TOPBAR_LABELS["core-mcp"]'));
    assert.ok(
      src.includes('matchOpsPeerPath("core-mcp")') ||
        src.includes("/operations/core-mcp") ||
        src.includes('"core-mcp"')
    );
    assert.ok(src.includes("/dashboard/mcp"));
    // 0100: runtime peer title (not catch-all "Operations")
    assert.equal(resolveDeepHeaderTitleFallback(buildOperationsPath("core-mcp")), "CoreMCP");
    assert.equal(resolveDeepHeaderTitleFallback("/dashboard/mcp"), "CoreMCP");
  });

  it("en.json user-facing MCP chrome defaults to CoreMCP", () => {
    const en = JSON.parse(read(EN_JSON)) as {
      sidebar?: Record<string, string>;
      header?: Record<string, string>;
      mcpDashboard?: Record<string, string>;
    };
    assert.equal(en.sidebar?.mcp, "CoreMCP");
    assert.equal(en.header?.mcp, "CoreMCP");
    assert.equal(en.mcpDashboard?.pageTitle, "CoreMCP");
    assert.ok(en.mcpDashboard?.howToTitle);
  });
});

describe("Anti-phantom chrome + no new primary leaves", () => {
  it("core-mcp content never mounts OperationsTopbar / Endpoint tabs / dual strips", () => {
    for (const rel of [CORE_MCP_PAGE, CORE_MCP_CLIENT]) {
      const src = read(rel);
      assert.equal(
        (src.match(/<OperationsTopbar\b/g) ?? []).length,
        0,
        `${rel} must not re-mount OperationsTopbar`
      );
      assert.equal(src.includes("PageTabBar"), false, `${rel} no PageTabBar`);
      assert.equal(src.includes("ENDPOINT_TABS"), false, `${rel} no ENDPOINT_TABS`);
      assert.equal(src.includes("CostsSubnav"), false);
      assert.equal(src.includes("ObserveHubSubnav"), false);
      assert.equal(src.includes("connect-protocol-homes"), false);
      assert.equal(src.includes("MetaMCP"), false, "must not invent MetaMCP UI");
    }
    // Layout remains sole topbar mount
    assert.equal((read(LAYOUT).match(/<OperationsTopbar\b/g) ?? []).length, 1);
    assert.ok(read(TOPBAR).includes("OPERATIONS_TOPBAR_LABELS"));
  });

  it("0 new primary sidebar leaves; core-mcp/mcp forbidden as primary", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("core-mcp"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("mcp"), false);
    assert.ok(EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS.includes("core-mcp"));
    assert.ok(EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS.includes("mcp"));
  });
});
