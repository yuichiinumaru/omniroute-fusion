/**
 * Task 0095 / EPIC-20 T20-J — Memory single-page: kill memories/engine/playground tab topbar.
 * Stack Memories → Engine → Playground; concept bottom collapsed; legacy redirects via 0086.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  OPERATIONS_REDIRECT_MATRIX,
  OPERATIONS_TOPBAR_IDS,
  buildOperationsPath,
  EPIC20_FORBIDDEN_MEMORY_SUBTOPBAR_IDS,
  EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS,
} from "../../../src/shared/constants/epic20Operations";
import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import { OPERATIONS_HUB_HREFS } from "../../../src/shared/constants/operationsHub";

const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const MEMORY_CLIENT = "src/app/(dashboard)/dashboard/memory/MemoryPageClient.tsx";
const LEGACY_PAGE = "src/app/(dashboard)/dashboard/memory/page.tsx";
const CANONICAL_PAGE = "src/app/(dashboard)/operations/memory/page.tsx";
const MEMORIES_TAB = "src/app/(dashboard)/dashboard/memory/components/tabs/MemoriesTab.tsx";
const ENGINE_TAB = "src/app/(dashboard)/dashboard/memory/components/tabs/EngineTab.tsx";
const PLAYGROUND_TAB = "src/app/(dashboard)/dashboard/memory/components/tabs/PlaygroundTab.tsx";
const CONCEPT = "src/app/(dashboard)/dashboard/memory/components/MemoryConceptCard.tsx";
const OPS_LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const SEGMENT_PAGE = "src/app/(dashboard)/operations/[segment]/page.tsx";

describe("EPIC-20 Memory single page route tree (0095)", () => {
  it("creates canonical /operations/memory page and keeps tab modules + concept", () => {
    for (const rel of [
      MEMORY_CLIENT,
      CANONICAL_PAGE,
      LEGACY_PAGE,
      MEMORIES_TAB,
      ENGINE_TAB,
      PLAYGROUND_TAB,
      CONCEPT,
    ]) {
      assert.equal(existsSync(join(ROOT, rel)), true, `missing ${rel}`);
    }
  });

  it("canonical page mounts MemoryPageClient without OperationsTopbar re-mount", () => {
    const page = read(CANONICAL_PAGE);
    assert.ok(page.includes("MemoryPageClient"), "canonical must render MemoryPageClient");
    assert.equal(
      (page.match(/<OperationsTopbar\b/g) ?? []).length,
      0,
      "content page must not re-mount Ops topbar (layout owns chrome)"
    );
    assert.equal(page.includes("PageTabBar"), false, "no PageTabBar on memory peer");
  });

  it("legacy /dashboard/memory redirects via buildOperationsPath(\"memory\")", () => {
    const page = read(LEGACY_PAGE);
    assert.ok(page.includes("redirect("), "legacy page must redirect");
    assert.ok(page.includes("buildOperationsPath"), "must use 0086 builder");
    assert.ok(
      page.includes('"memory"') || page.includes("'memory'"),
      "redirect target must be memory peer"
    );
    assert.equal(
      page.includes("MemoryPageClient") || page.includes("MemoriesTab"),
      false,
      "legacy page must not still render memory body (redirect shell only)"
    );
  });

  it("0086 matrix rows for memory land on /operations/memory", () => {
    const memoryRows = OPERATIONS_REDIRECT_MATRIX.filter((r) => r.ownerTask === "0095");
    assert.ok(memoryRows.length >= 4, "expect base + 3 tab legacy rows");
    for (const row of memoryRows) {
      assert.equal(row.to, buildOperationsPath("memory"));
      assert.equal(row.to, "/operations/memory");
      assert.equal(row.hub, "operations");
    }
    const froms = new Set(memoryRows.map((r) => r.from));
    for (const from of [
      "/dashboard/memory",
      "/dashboard/memory?tab=memories",
      "/dashboard/memory?tab=engine",
      "/dashboard/memory?tab=playground",
    ]) {
      assert.ok(froms.has(from), `matrix missing from ${from}`);
    }
  });
});

describe("Memory single-scroll stack — no tab topbar L1", () => {
  it("client kills tab-* L1 nav buttons; stacks sections with data-section markers", () => {
    const src = read(MEMORY_CLIENT);

    // No L1 tab strip chrome (former data-testid={`tab-${tab}`} buttons)
    assert.equal(
      /data-testid=\{`tab-\$\{/.test(src) || /data-testid="tab-memories"/.test(src),
      false,
      "must not mount tab-* testids as L1 navigation buttons"
    );
    assert.equal(
      /setTab\s*=|activeTab\s*[:=]/.test(src),
      false,
      "must not keep activeTab / setTab tab chrome state"
    );
    assert.equal(src.includes("PageTabBar"), false);

    // Section markers in product order Memories → Engine → Playground
    for (const id of ["memories", "engine", "playground"] as const) {
      assert.ok(
        src.includes(`data-section="${id}"`) || src.includes(`data-section={'${id}'}`),
        `missing data-section=${id}`
      );
    }

    // Source-order stack: memories before engine before playground
    const iMem = src.indexOf('data-section="memories"');
    const iEng = src.indexOf('data-section="engine"');
    const iPlay = src.indexOf('data-section="playground"');
    assert.ok(iMem >= 0 && iEng > iMem && iPlay > iEng, "DOM source order Memories→Engine→Playground");
  });

  it("re-homes tab modules as section content (imports preserved)", () => {
    const src = read(MEMORY_CLIENT);
    assert.ok(src.includes("MemoriesTab"), "imports MemoriesTab");
    assert.ok(src.includes("EngineTab"), "imports EngineTab");
    assert.ok(src.includes("PlaygroundTab"), "imports PlaygroundTab");
    assert.ok(existsSync(join(ROOT, MEMORIES_TAB)));
    assert.ok(existsSync(join(ROOT, ENGINE_TAB)));
    assert.ok(existsSync(join(ROOT, PLAYGROUND_TAB)));
  });

  it("Memories defaultOpen true; Engine/Playground collapsible; concept bottom collapsed", () => {
    const src = read(MEMORY_CLIENT);
    assert.ok(src.includes("Collapsible"), "uses shared Collapsible for sections");

    // Concept card moved to bottom and collapsed by default
    assert.ok(src.includes("MemoryConceptCard"), "still mounts concept card");
    const conceptSectionIdx = src.indexOf('data-section="concept"');
    const playIdx = src.indexOf('data-section="playground"');
    assert.ok(conceptSectionIdx > playIdx, "concept section after playground (bottom)");
    // JSX mount (not the import line)
    const jsxMountIdx = src.indexOf("<MemoryConceptCard");
    assert.ok(jsxMountIdx > playIdx, "concept card JSX after playground section");

    // Concept section defaultOpen={false}
    const conceptSection = src.slice(conceptSectionIdx, conceptSectionIdx + 500);
    assert.ok(
      conceptSection.includes("defaultOpen={false}"),
      "concept explainer must default collapsed"
    );

    // Memories expanded by default
    const memSlice = src.slice(
      src.indexOf('data-section="memories"'),
      src.indexOf('data-section="engine"')
    );
    assert.ok(memSlice.includes("defaultOpen={true}"), "Memories section should be default expanded");
  });

  it("enable toggle remains reachable (header, not tab-chrome dependent)", () => {
    const src = read(MEMORY_CLIENT);
    assert.ok(src.includes("useMemorySettings"), "uses settings hook");
    assert.ok(/role="switch"/.test(src), "renders enable switch");
    assert.ok(
      src.includes("memory-enabled-toggle") || src.includes("memoryEnabled"),
      "enable toggle labeled/testable"
    );
    assert.ok(src.includes("save({ enabled:") || src.includes('enabled:'), "persists enabled");
  });
});

describe("Anti-phantom + no-new-leaf (0095)", () => {
  it("Ops shell still mounts exactly one OperationsTopbar; memory peer has no dual chrome", () => {
    const layout = read(OPS_LAYOUT);
    assert.equal((layout.match(/<OperationsTopbar\b/g) ?? []).length, 1);

    const client = read(MEMORY_CLIENT);
    assert.equal((client.match(/<OperationsTopbar\b/g) ?? []).length, 0);
    assert.equal(client.includes("PageTabBar"), false);
    assert.equal(client.includes("CostsSubnav"), false);
    assert.equal(client.includes("DashboardTopbar"), false);

    // Forbidden memory sub-topbar ids must not appear as Ops peers
    for (const id of EPIC20_FORBIDDEN_MEMORY_SUBTOPBAR_IDS) {
      assert.equal(
        (OPERATIONS_TOPBAR_IDS as readonly string[]).includes(id),
        false,
        `${id} must not be Ops topbar peer`
      );
    }
  });

  it("no new primary sidebar leaf for memory; ops peer only", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("memory"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
    assert.ok(EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS.includes("memory"));
    assert.equal(buildOperationsPath("memory"), "/operations/memory");
  });

  it("operations hub discovery card points at canonical memory path", () => {
    assert.ok(
      OPERATIONS_HUB_HREFS.includes("/operations/memory") ||
        OPERATIONS_HUB_HREFS.includes(buildOperationsPath("memory")),
      "hub card should discover canonical /operations/memory"
    );
    // Legacy path may remain only as redirect shell — not as preferred discovery
    // (allowed residual during pilot; preferred is canonical)
  });
});
