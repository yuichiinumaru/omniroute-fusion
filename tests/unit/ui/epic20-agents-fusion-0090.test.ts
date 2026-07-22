/**
 * Task 0090 / EPIC-20 T20-E — Agents fusion (CLI Agents + CLI Code) under /operations/agents.
 * Anti-phantom chrome, redirects via 0086 builders, grid/list, explainers bottom, detail strategy A.
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
  OPERATIONS_HUB_GROUPS,
  OPERATIONS_HUB_HREFS,
} from "../../../src/shared/constants/operationsHub";
import {
  EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS,
  OPERATIONS_REDIRECT_MATRIX,
  buildOperationsPath,
} from "../../../src/shared/constants/epic20Operations";
const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const AGENTS_PAGE = "src/app/(dashboard)/operations/agents/page.tsx";
const AGENTS_CLIENT = "src/app/(dashboard)/operations/agents/AgentsFusionClient.tsx";
const LEGACY_AGENTS_LIST = "src/app/(dashboard)/dashboard/cli-agents/page.tsx";
const LEGACY_CODE_LIST = "src/app/(dashboard)/dashboard/cli-code/page.tsx";
const DETAIL_AGENTS = "src/app/(dashboard)/dashboard/cli-agents/[id]/page.tsx";
const DETAIL_CODE = "src/app/(dashboard)/dashboard/cli-code/[id]/page.tsx";
const LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const SEGMENT = "src/app/(dashboard)/operations/[segment]/page.tsx";

const AGENTS_PATH = buildOperationsPath("agents");

describe("EPIC-20 Agents fusion routes (0090)", () => {
  it("creates /operations/agents page + fusion client", () => {
    assert.equal(existsSync(join(ROOT, AGENTS_PAGE)), true);
    assert.equal(existsSync(join(ROOT, AGENTS_CLIENT)), true);
    const page = read(AGENTS_PAGE);
    assert.ok(page.includes("AgentsFusionClient"));
    assert.equal(page.includes("OperationsTopbar"), false, "page must not mount topbar");
    assert.equal(page.includes("PageTabBar"), false);
  });

  it("fusion client is content-only under shell (no second topbar)", () => {
    const src = read(AGENTS_CLIENT);
    assert.ok(src.includes('data-testid="operations-agents-fusion"'));
    assert.ok(src.includes("data-operations-agents-fusion"));
    // No actual mount/import of chrome (comment mention of OperationsTopbar is OK)
    assert.equal(/import\s+.*OperationsTopbar/.test(src) || /<OperationsTopbar\b/.test(src), false);
    assert.equal(/import\s+PageTabBar\b/.test(src) || /<PageTabBar\b/.test(src), false);
    assert.equal(/import\s+CostsSubnav\b/.test(src) || /<CostsSubnav\b/.test(src), false);
    // Layout still owns the single topbar
    const layout = read(LAYOUT);
    const mounts = layout.match(/<OperationsTopbar\b/g) ?? [];
    assert.equal(mounts.length, 1);
  });

  it("vertical collapsibles: CLI Agents then CLI Code, both defaultOpen true", () => {
    const src = read(AGENTS_CLIENT);
    assert.ok(src.includes('data-agents-block="cli-agents"'));
    assert.ok(src.includes('data-agents-block="cli-code"'));
    assert.ok(src.includes('id="cli-agents"'));
    assert.ok(src.includes('id="cli-code"'));

    const agentsIdx = src.indexOf('data-agents-block="cli-agents"');
    const codeIdx = src.indexOf('data-agents-block="cli-code"');
    assert.ok(agentsIdx > 0 && codeIdx > agentsIdx, "Agents block must precede Code block");

    // defaultOpen={true} appears for both work blocks before explainers
    const explainerIdx = src.indexOf("data-agents-explainers");
    assert.ok(explainerIdx > codeIdx);
    const beforeExplainers = src.slice(0, explainerIdx);
    const openTrue = beforeExplainers.match(/defaultOpen=\{true\}/g) ?? [];
    assert.ok(openTrue.length >= 2, "both work collapsibles default expanded");
  });

  it("explainers are bottom + default collapsed (not top non-collapsible wall)", () => {
    const src = read(AGENTS_CLIENT);
    assert.ok(src.includes('data-explainer-placement="bottom"'));
    assert.ok(src.includes('data-testid="agents-explainers"'));

    // JSX concept/comparison only appear inside the explainers region (after work blocks)
    const firstConcept = src.indexOf("<CliConceptCard");
    const firstComparison = src.indexOf("<CliComparisonCard");
    const explainerMarker = src.indexOf("data-agents-explainers");
    assert.ok(firstConcept > explainerMarker, "CliConceptCard must not render above explainers block");
    assert.ok(
      firstComparison > explainerMarker,
      "CliComparisonCard must not render above explainers block"
    );

    // Explainer collapsible defaults closed
    const afterExplainer = src.slice(explainerMarker);
    assert.ok(afterExplainer.includes("defaultOpen={false}"));

    // No top-of-page concept wall before tool blocks
    const firstBlock = src.indexOf('data-agents-block="cli-agents"');
    assert.ok(firstConcept > firstBlock);
  });

  it("shared grid vs list toggle with storage key", () => {
    const src = read(AGENTS_CLIENT);
    assert.ok(src.includes('data-testid="agents-view-mode-control"'));
    // Dynamic test ids: agents-view-mode-${option.mode} for grid|list
    assert.ok(src.includes("agents-view-mode-${option.mode}"));
    assert.ok(src.includes('{ mode: "grid"'));
    assert.ok(src.includes('{ mode: "list"'));
    assert.ok(src.includes("data-view-layout={viewMode}"));
    assert.ok(src.includes("omniroute.operations.agents.viewMode"));
    assert.ok(src.includes("parseAgentsViewMode"));
    assert.ok(src.includes('if (raw === "grid" || raw === "list") return raw'));
    // CliToolCard receives layout prop for density switch
    assert.ok(src.includes("layout={viewMode}"));
    const toolCard = read("src/shared/components/cli/CliToolCard.tsx");
    assert.ok(toolCard.includes('layout?: "grid" | "list"'));
    assert.ok(toolCard.includes("data-layout={layout}"));
  });

  it("legacy list pages redirect via buildOperationsPath(agents)", () => {
    for (const rel of [LEGACY_AGENTS_LIST, LEGACY_CODE_LIST]) {
      const page = read(rel);
      assert.ok(page.includes("redirect("), `${rel} must redirect`);
      assert.ok(page.includes("buildOperationsPath"), `${rel} must use 0086 builder`);
      assert.ok(page.includes('"agents"') || page.includes("'agents'"), `${rel} agents peer`);
      assert.equal(
        page.includes("CliAgentsPageClient") || page.includes("CliCodePageClient"),
        false,
        `${rel} must be redirect shell only`
      );
    }
    // Matrix rows frozen in 0086
    const agentRows = OPERATIONS_REDIRECT_MATRIX.filter((r) => r.ownerTask === "0090");
    assert.ok(agentRows.some((r) => r.from === "/dashboard/cli-agents" && r.to === AGENTS_PATH));
    assert.ok(agentRows.some((r) => r.from === "/dashboard/cli-code" && r.to === AGENTS_PATH));
  });

  it("detail route strategy A: keeps /dashboard/cli-agents|cli-code/[id]", () => {
    assert.equal(existsSync(join(ROOT, DETAIL_AGENTS)), true);
    assert.equal(existsSync(join(ROOT, DETAIL_CODE)), true);
    const agentsDetail = read(DETAIL_AGENTS);
    const codeDetail = read(DETAIL_CODE);
    assert.ok(agentsDetail.includes("ToolDetailClient"));
    assert.ok(codeDetail.includes("ToolDetailClient"));
    assert.equal(agentsDetail.includes("redirect("), false, "detail must not redirect away");
    assert.equal(codeDetail.includes("redirect("), false);

    const client = read(AGENTS_CLIENT);
    assert.ok(client.includes('detailBase="/dashboard/cli-agents"'));
    assert.ok(client.includes('detailBase="/dashboard/cli-code"'));
    // Strategy B paths must not appear as detail hosts
    assert.equal(client.includes("/operations/agents/agent/"), false);
    assert.equal(client.includes("/operations/agents/code/"), false);
  });

  it("does not fuse Cloud Agents / ACP / Bridge into this page", () => {
    const src = read(AGENTS_CLIENT);
    assert.equal(src.includes("cloud-agents"), false);
    assert.equal(src.includes("CloudAgents"), false);
    assert.equal(src.includes("agent-bridge"), false);
    assert.equal(src.includes("AcpAgents"), false);
    assert.equal(src.includes("a2a-acp"), false);
  });

  it("0 new primary leaves for CLI Agents/Code; ops leaf unchanged", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("cli-agents"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("cli-code"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("agents"), false);
    // Topbar peer id "agents" must never become a primary leaf (0086 freeze)
    assert.ok((EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS as readonly string[]).includes("agents"));
    const ops = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "operations");
    assert.ok(ops);
    assert.equal(ops.href, "/operations");
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
  });

  it("hub cards retarget to operations agents fusion", () => {
    const agentsGroup = OPERATIONS_HUB_GROUPS.find((g) => g.id === "agents");
    assert.ok(agentsGroup);
    const cliAgents = agentsGroup.links.find((l) => l.id === "cli-agents");
    const cliCode = agentsGroup.links.find((l) => l.id === "cli-code");
    assert.ok(cliAgents);
    assert.ok(cliCode);
    assert.ok(cliAgents.href.startsWith(AGENTS_PATH));
    assert.ok(cliCode.href.startsWith(AGENTS_PATH));
    assert.ok(OPERATIONS_HUB_HREFS.some((h) => h.startsWith(AGENTS_PATH)));
  });

  it("static agents route wins over [segment] placeholder for this peer", () => {
    // Fusion is owned by dedicated page; segment still validates other peers
    const segment = read(SEGMENT);
    assert.ok(segment.includes("isOperationsTopbarId"));
    // Dedicated page exists (Next prefers static segment)
    assert.equal(existsSync(join(ROOT, AGENTS_PAGE)), true);
  });

  it("fusion chrome strings use i18n keys (path-to-100)", () => {
    const src = read(AGENTS_CLIENT);
    assert.ok(src.includes('tAgents("fusionPageTitle")') || src.includes("fusionPageTitle"));
    assert.ok(src.includes("viewModeGrid"));
    assert.ok(src.includes("viewModeList"));
    assert.ok(src.includes("explainersTitle"));
    assert.ok(src.includes('tCode("emptyState")') || src.includes("emptyState"));
    assert.ok(src.includes('tCode("visibleCount"'));
    // No permanent hardcoded EN page chrome (labels come from next-intl keys)
    assert.equal(src.includes(">Agents</h1>"), false);
    assert.equal(src.includes('"About CLI Agents & Code"'), false);
  });

  it("orphan list clients are deprecated (do not remount top walls)", () => {
    for (const rel of [
      "src/app/(dashboard)/dashboard/cli-agents/CliAgentsPageClient.tsx",
      "src/app/(dashboard)/dashboard/cli-code/CliCodePageClient.tsx",
    ]) {
      const src = read(rel);
      assert.ok(src.includes("@deprecated") || src.includes("0090"), `${rel} deprecation note`);
      assert.ok(src.includes("AgentsFusionClient") || src.includes("/operations/agents"), rel);
    }
  });
});
