import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS,
  CONNECT_CATALOG_SSOT_HREF,
  CONNECT_RETIRED_API_ENDPOINTS_HREF,
  PRIMARY_SIDEBAR_ITEM_IDS,
  SIDEBAR_SECTIONS,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";
import { OPERATIONS_HUB_HREFS } from "../../../src/shared/constants/operationsHub";

const repoRoot = join(import.meta.dirname, "../../..");

/**
 * Flat primary nav: exposures nest under Providers / Operations hubs on-page.
 * MCP/A2A routes remain SSoT; not every protocol is a peer sidebar leaf.
 * Catalog SSoT is `CONNECT_CATALOG_SSOT_HREF` — retired `CONNECT_RETIRED_API_ENDPOINTS_HREF`
 * is redirect-only and must not reappear as an Operations hub / palette discovery peer.
 */

function defaultLeafIds(): string[] {
  return SIDEBAR_SECTIONS.filter((s) => s.visibility !== "debug").flatMap((section) =>
    getSectionItems(section).map((item) => item.id)
  );
}

/** Catalog-ish destinations that must not dual-home the same SSoT. */
const CATALOG_SSOT_HREF = CONNECT_CATALOG_SSOT_HREF;
const RETIRED_API_ENDPOINTS_HREF = CONNECT_RETIRED_API_ENDPOINTS_HREF;

describe("CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS hideable retention", () => {
  for (const id of CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS) {
    it(`keeps hideable id "${id}" for prefs`, () => {
      assert.ok(
        (HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes(id),
        `Expected HIDEABLE_SIDEBAR_ITEM_IDS to include "${id}"`
      );
    });
  }
});

describe("default flat sidebar connect/exposure policy", () => {
  const leafIds = defaultLeafIds();

  it("providers + operations are primary hubs (API Keys absorbed into Operations)", () => {
    assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("providers"));
    assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("operations"));
    assert.ok(leafIds.includes("providers"));
    assert.ok(leafIds.includes("operations"));
    // Task 0059: api-manager is no longer a primary peer leaf
    assert.ok(!PRIMARY_SIDEBAR_ITEM_IDS.includes("api-manager"));
    assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("api-manager"));
  });

  it("does not dump mcp/a2a/api-endpoints as primary peers", () => {
    assert.ok(!leafIds.includes("mcp"));
    assert.ok(!leafIds.includes("a2a"));
    assert.ok(!leafIds.includes("api-endpoints"));
    assert.ok(!leafIds.includes("endpoints"));
  });

  it("retired exposure ids remain hideable", () => {
    for (const id of CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS) {
      assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes(id));
    }
  });
});

describe("Operations hub does not dual-home catalog (Task 0024 × 0059)", () => {
  it("includes the single catalog SSoT href", () => {
    assert.ok(
      OPERATIONS_HUB_HREFS.includes(CATALOG_SSOT_HREF),
      `Operations hub must expose catalog SSoT ${CATALOG_SSOT_HREF}`
    );
  });

  it("does not list retired /dashboard/api-endpoints as a discovery peer", () => {
    assert.equal(
      OPERATIONS_HUB_HREFS.includes(RETIRED_API_ENDPOINTS_HREF),
      false,
      "retired api-endpoints redirect must not be a hub discovery peer"
    );
  });

  it("has at most one catalog destination (no dual catalog homes)", () => {
    const catalogish = OPERATIONS_HUB_HREFS.filter(
      (href) =>
        href === CATALOG_SSOT_HREF ||
        href === RETIRED_API_ENDPOINTS_HREF ||
        href.includes("tab=catalog") ||
        href === "/dashboard/api-endpoints"
    );
    assert.deepEqual(
      catalogish,
      [CATALOG_SSOT_HREF],
      `expected single catalog home, got: ${catalogish.join(", ")}`
    );
  });
});

describe("Connect route files still implement redirects", () => {
  it("api-endpoints page redirects to catalog via CONNECT_CATALOG_SSOT_HREF", async () => {
    const src = await readFile(
      join(repoRoot, "src/app/(dashboard)/dashboard/api-endpoints/page.tsx"),
      "utf-8"
    );
    assert.ok(src.includes("redirect"));
    assert.ok(
      src.includes("CONNECT_CATALOG_SSOT_HREF"),
      "redirect target must use CONNECT_CATALOG_SSOT_HREF (no dual hardcoded catalog string)"
    );
    assert.ok(
      src.includes('from "@/shared/constants/sidebarVisibility"') ||
        src.includes("from '@/shared/constants/sidebarVisibility'"),
      "must import catalog SSoT from sidebarVisibility"
    );
  });

  it("endpoint page redirects tab=mcp to /dashboard/mcp", async () => {
    const src = await readFile(
      join(repoRoot, "src/app/(dashboard)/dashboard/endpoint/page.tsx"),
      "utf-8"
    );
    assert.ok(src.includes("redirect"), "endpoint page must use next/navigation redirect");
    assert.ok(
      /tab\s*===\s*["']mcp["']/.test(src) || src.includes('tab === "mcp"') || src.includes("tab===\"mcp\""),
      "must branch on tab=mcp"
    );
    assert.ok(src.includes('redirect("/dashboard/mcp")') || src.includes('redirect("/dashboard/mcp")'));
  });

  it("endpoint page redirects tab=a2a to /dashboard/a2a", async () => {
    const src = await readFile(
      join(repoRoot, "src/app/(dashboard)/dashboard/endpoint/page.tsx"),
      "utf-8"
    );
    assert.ok(
      /tab\s*===\s*["']a2a["']/.test(src) || src.includes('tab === "a2a"'),
      "must branch on tab=a2a"
    );
    assert.ok(src.includes('redirect("/dashboard/a2a")'));
  });
});

describe("Discovery chrome does not dual-brand retired catalog path (Task 0024)", () => {
  it("CommandPalette has no href to retired /dashboard/api-endpoints", async () => {
    const src = await readFile(join(repoRoot, "src/shared/components/CommandPalette.tsx"), "utf-8");
    assert.equal(
      src.includes('"/dashboard/api-endpoints"') || src.includes("'/dashboard/api-endpoints'"),
      false,
      "palette must not advertise retired api-endpoints path"
    );
  });

  it("Header brands retired api-endpoints as catalog SSoT alias (not competing API Endpoints title)", async () => {
    const src = await readFile(join(repoRoot, "src/shared/components/Header.tsx"), "utf-8");
    // Still matches the path for defensive title resolution after client navigations
    assert.ok(src.includes("/dashboard/api-endpoints"));
    // Must not keep competing discovery brand "API Endpoints" as titleFallback
    assert.equal(
      /api-endpoints[\s\S]{0,400}titleFallback:\s*["']API Endpoints["']/.test(src),
      false,
      "Header must not title retired path as competing API Endpoints brand"
    );
    // Catalog-aligned branding
    assert.ok(
      /api-endpoints[\s\S]{0,500}titleFallback:\s*["']API Catalog["']/.test(src) ||
        /api-endpoints[\s\S]{0,500}icon:\s*["']menu_book["']/.test(src),
      "Header retired path should alias catalog SSoT branding"
    );
  });

  it("exports CONNECT_CATALOG_SSOT_HREF as single catalog destination constant", () => {
    assert.equal(CONNECT_CATALOG_SSOT_HREF, "/dashboard/endpoint?tab=catalog");
    assert.equal(CONNECT_RETIRED_API_ENDPOINTS_HREF, "/dashboard/api-endpoints");
    assert.ok(OPERATIONS_HUB_HREFS.includes(CONNECT_CATALOG_SSOT_HREF));
    assert.equal(OPERATIONS_HUB_HREFS.includes(CONNECT_RETIRED_API_ENDPOINTS_HREF), false);
  });
});
