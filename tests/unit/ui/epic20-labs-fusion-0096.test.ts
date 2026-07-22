/**
 * Task 0096 / EPIC-20 T20-K — Labs fused page under Operations.
 * Vertical stack: Playground → Translator → Search Tools → Batch(+Files).
 * Mode chrome in-block only; explainers bottom default-collapsed; legacy redirects.
 * Anti-phantom: ≤1 Ops hub topbar; no Media inside Labs; no-new-leaf labs.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
  SIDEBAR_SECTIONS,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OPERATIONS_REDIRECT_MATRIX,
  OPERATIONS_TOPBAR_IDS,
  buildOperationsPath,
} from "../../../src/shared/constants/epic20Operations";
import { resolveOperationsTopbarActive } from "../../../src/app/(dashboard)/operations/OperationsTopbar";

const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const LABS_PAGE = "src/app/(dashboard)/operations/labs/page.tsx";
const LABS_CLIENT = "src/app/(dashboard)/operations/labs/LabsPageClient.tsx";
const OPS_LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const PLAYGROUND_STUDIO =
  "src/app/(dashboard)/dashboard/playground/PlaygroundStudio.tsx";
const SEARCH_CLIENT =
  "src/app/(dashboard)/dashboard/search-tools/SearchToolsClient.tsx";
const TRANSLATOR_CLIENT =
  "src/app/(dashboard)/dashboard/translator/TranslatorPageClient.tsx";

const LEGACY_REDIRECTS = [
  "src/app/(dashboard)/dashboard/playground/page.tsx",
  "src/app/(dashboard)/dashboard/translator/page.tsx",
  "src/app/(dashboard)/dashboard/search-tools/page.tsx",
  "src/app/(dashboard)/dashboard/batch/page.tsx",
  "src/app/(dashboard)/dashboard/batch/files/page.tsx",
] as const;

const LAB_SIDEBAR_ABSENT = ["playground", "translator", "search-tools"] as const;

describe("EPIC-20 Labs fused page route (0096)", () => {
  it("creates canonical /operations/labs page + client", () => {
    assert.equal(existsSync(join(ROOT, LABS_PAGE)), true, `missing ${LABS_PAGE}`);
    assert.equal(existsSync(join(ROOT, LABS_CLIENT)), true, `missing ${LABS_CLIENT}`);
    const page = read(LABS_PAGE);
    assert.ok(page.includes("LabsPageClient"), "page must mount LabsPageClient");
    assert.equal(
      page.includes("OperationsTopbar"),
      false,
      "Labs page must not re-mount Ops topbar (layout-owned)"
    );
    assert.equal(
      page.includes("PageTabBar"),
      false,
      "Labs page must not mount PageTabBar as hub chrome"
    );
  });

  it("canonical path matches 0086 builder (labs peer)", () => {
    assert.equal(buildOperationsPath("labs"), "/operations/labs");
    assert.ok(OPERATIONS_TOPBAR_IDS.includes("labs"));
    assert.equal(resolveOperationsTopbarActive("/operations/labs"), "labs");
  });
});

describe("Labs vertical fusion order + collapsibles", () => {
  it("stacks Playground → Translator → Search → Batch(+Files) with markers", () => {
    const src = read(LABS_CLIENT);
    const playground = src.indexOf('data-labs-block="playground"');
    const translator = src.indexOf('data-labs-block="translator"');
    const search = src.indexOf('data-labs-block="search-tools"');
    const batch = src.indexOf('data-labs-block="batch"');
    const files = src.indexOf('data-labs-block="batch-files"');

    assert.ok(playground >= 0, "playground block marker");
    assert.ok(translator >= 0, "translator block marker");
    assert.ok(search >= 0, "search-tools block marker");
    assert.ok(batch >= 0, "batch block marker");
    assert.ok(files >= 0, "batch-files nested marker");

    assert.ok(playground < translator, "Playground before Translator");
    assert.ok(translator < search, "Translator before Search");
    assert.ok(search < batch, "Search before Batch");
    assert.ok(batch < files, "Batch before nested Files");
  });

  it("uses Collapsible sections; Playground defaultOpen; others collapsed", () => {
    const src = read(LABS_CLIENT);
    assert.ok(
      src.includes("Collapsible") || src.includes("CollapsibleSection"),
      "must use shared collapsible primitive"
    );
    // Playground expanded by default
    assert.ok(
      /data-labs-block="playground"[\s\S]{0,400}defaultOpen=\{true\}/.test(src) ||
        /defaultOpen=\{true\}[\s\S]{0,400}data-labs-block="playground"/.test(src) ||
        /title=\{?["']Playground["']\}?[\s\S]{0,200}defaultOpen=\{true\}/.test(src) ||
        /defaultOpen=\{true\}[\s\S]{0,200}["']Playground["']/.test(src),
      "Playground section defaultOpen=true"
    );
  });

  it("explainers sit at page bottom, default collapsed", () => {
    const src = read(LABS_CLIENT);
    const explainers = src.indexOf('data-testid="labs-explainers"');
    const playground = src.indexOf('data-labs-block="playground"');
    assert.ok(explainers >= 0, "labs-explainers marker required");
    assert.ok(playground >= 0 && playground < explainers, "explainers after work blocks");
    assert.ok(
      src.includes("TranslatorConceptCard") || src.includes("translator-concept"),
      "Translator concept in explainer stack"
    );
    assert.ok(
      src.includes("SearchConceptCard") || src.includes("search-concept"),
      "Search concept in explainer stack"
    );
    assert.ok(
      src.includes("BatchConceptCard") || src.includes("batch-concept"),
      "Batch concept in explainer stack"
    );
    // defaultOpen={false} near explainers region
    const explainerRegion = src.slice(explainers);
    assert.ok(
      explainerRegion.includes("defaultOpen={false}") ||
        explainerRegion.includes("defaultCollapsed") ||
        explainerRegion.includes("defaultOpen={ false }"),
      "explainers default collapsed"
    );
  });

  it("does not include Media modality strip inside Labs", () => {
    const src = read(LABS_CLIENT);
    assert.equal(src.includes("MediaPageClient"), false);
    assert.equal(src.includes("cache/media"), false);
    assert.equal(/modality.*(image|video|music)/i.test(src), false);
    assert.equal(src.includes('data-labs-block="media"'), false);
  });
});

describe("Playground + Search mode chrome (in-block, not hub L1)", () => {
  it("PlaygroundStudio supports inline mode chrome (not hub StudioTopBar strip only)", () => {
    const studio = read(PLAYGROUND_STUDIO);
    assert.ok(
      studio.includes("modeChrome") || studio.includes("inline"),
      "PlaygroundStudio must accept embedded/inline mode chrome for Labs"
    );
    const labs = read(LABS_CLIENT);
    assert.ok(
      labs.includes("PlaygroundStudio"),
      "Labs composes PlaygroundStudio (no business-logic clone)"
    );
    assert.ok(
      /modeChrome\s*=\s*["']inline["']/.test(labs) ||
        /modeChrome=\{\s*["']inline["']\s*\}/.test(labs) ||
        labs.includes('modeChrome="inline"'),
      "Labs mounts Playground with inline mode chrome"
    );
  });

  it("Search modes fuse in-block; Labs does not mount search-tools-topbar as L1", () => {
    const labs = read(LABS_CLIENT);
    const searchClient = read(SEARCH_CLIENT);
    assert.ok(labs.includes("SearchToolsClient") || labs.includes("search-tools"), "compose Search");
    // Labs source must not hardcode hub L1 search-tools-topbar strip
    assert.equal(
      labs.includes('data-testid="search-tools-topbar"'),
      false,
      "Labs must not declare search-tools-topbar as L1 hub strip"
    );
    assert.ok(
      searchClient.includes("modeChrome") || searchClient.includes("inline"),
      "SearchToolsClient supports inline mode chrome"
    );
  });

  it("preserves playground ?tab= deep-link resolution", () => {
    const studio = read(PLAYGROUND_STUDIO);
    assert.ok(studio.includes("searchParams") || studio.includes("useSearchParams"));
    assert.ok(studio.includes("tab"));
    assert.ok(studio.includes("chat") && studio.includes("compare"));
    assert.ok(studio.includes("api") && studio.includes("build"));
  });
});

describe("Legacy lab redirects → Labs (0096 matrix)", () => {
  const expectedFrom = [
    "/dashboard/playground",
    "/dashboard/translator",
    "/dashboard/search-tools",
    "/dashboard/batch",
    "/dashboard/batch/files",
  ] as const;

  it("0086 matrix rows for 0096 point at buildOperationsPath(labs)", () => {
    const labsTo = buildOperationsPath("labs");
    for (const from of expectedFrom) {
      const row = OPERATIONS_REDIRECT_MATRIX.find(
        (r) => r.from === from && r.ownerTask === "0096"
      );
      assert.ok(row, `matrix missing 0096 row for ${from}`);
      assert.equal(row!.to, labsTo);
      assert.equal(row!.hub, "operations");
    }
  });

  it("legacy page shells redirect via buildOperationsPath (not dual-serve clients)", () => {
    for (const rel of LEGACY_REDIRECTS) {
      assert.equal(existsSync(join(ROOT, rel)), true, `missing ${rel}`);
      const src = read(rel);
      assert.ok(src.includes("redirect("), `${rel} must redirect()`);
      assert.ok(
        src.includes("buildOperationsPath"),
        `${rel} must use 0086 builder`
      );
      assert.ok(src.includes('"labs"') || src.includes("'labs'"), `${rel} → labs peer`);
    }
  });

  it("playground redirect preserves ?tab= query", () => {
    const src = read("src/app/(dashboard)/dashboard/playground/page.tsx");
    assert.ok(
      src.includes("tab") || src.includes("searchParams"),
      "playground redirect must consider ?tab= deep-link"
    );
  });

  it("batch/files redirect deep-links files subsection when supported", () => {
    const src = read("src/app/(dashboard)/dashboard/batch/files/page.tsx");
    assert.ok(
      src.includes("section") ||
        src.includes("files") ||
        src.includes("buildOperationsPath"),
      "files redirect should target Labs (optional section deep-link)"
    );
  });
});

describe("Anti-phantom chrome + no-new-leaf (0096)", () => {
  it("Ops layout mounts OperationsTopbar exactly once; Labs client does not", () => {
    const layout = read(OPS_LAYOUT);
    const mounts = layout.match(/<OperationsTopbar\b/g) ?? [];
    assert.equal(mounts.length, 1, "layout topbar mount count === 1");
    const labs = read(LABS_CLIENT);
    assert.equal(labs.includes("OperationsTopbar"), false);
    assert.equal(labs.includes("data-operations-topbar"), false);
    assert.equal(
      /import\s+PageTabBar\b/.test(labs) || /<PageTabBar\b/.test(labs),
      false
    );
    assert.equal(
      /import\s+CostsSubnav\b/.test(labs) || /<CostsSubnav\b/.test(labs),
      false
    );
  });

  it("playground / translator / search-tools stay absent from primary + DEVTOOLS", () => {
    for (const id of LAB_SIDEBAR_ABSENT) {
      assert.equal(
        PRIMARY_SIDEBAR_ITEM_IDS.includes(id),
        false,
        `${id} must not be primary leaf`
      );
    }
    const leafIds = SIDEBAR_SECTIONS.flatMap((s) => getSectionItems(s).map((i) => i.id));
    for (const id of LAB_SIDEBAR_ABSENT) {
      assert.equal(leafIds.includes(id), false, `${id} must not appear in sidebar sections`);
    }
    // DEVTOOLS_ITEMS is module-private — assert empty array in source (0060 / 0083 contract)
    const sidebarSrc = read("src/shared/constants/sidebarVisibility.ts");
    const match = sidebarSrc.match(
      /const DEVTOOLS_ITEMS: readonly SidebarItemDefinition\[\] = \[([\s\S]*?)\];/
    );
    assert.ok(match, "DEVTOOLS_ITEMS declaration must exist");
    assert.equal(match![1].trim(), "", "DEVTOOLS_ITEMS must remain empty (no labs)");
    // Primary budget stays 7 (EPIC-19 0082) — no labs leaf added
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
  });

  it("Translator client can hide concept card when composed in Labs", () => {
    const src = read(TRANSLATOR_CLIENT);
    assert.ok(
      src.includes("showConceptCard") || src.includes("conceptCard"),
      "TranslatorPageClient must allow hiding concept card for Labs bottom stack"
    );
  });
});
