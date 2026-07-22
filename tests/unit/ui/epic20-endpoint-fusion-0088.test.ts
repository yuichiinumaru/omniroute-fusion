/**
 * Task 0088 / EPIC-20 T20-C — Endpoint fusion: Keys + APIs + Catalog under
 * `/operations/endpoints`; kill dual/sub topbars; legacy redirects via 0086 builders.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRIMARY_SIDEBAR_ITEM_IDS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  CONNECT_CATALOG_LEGACY_HREF,
  CONNECT_CATALOG_SSOT_HREF,
  CONNECT_RETIRED_API_ENDPOINTS_HREF,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OPERATIONS_REDIRECT_MATRIX,
  buildOperationsPath,
  OPERATIONS_TOPBAR_IDS,
} from "../../../src/shared/constants/epic20Operations";

const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

const FUSION_PAGE = "src/app/(dashboard)/operations/endpoints/page.tsx";
const FUSION_CLIENT = "src/app/(dashboard)/operations/endpoints/EndpointsFusionClient.tsx";
const LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const ENDPOINT_CLIENT = "src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx";
const ENDPOINT_PAGE = "src/app/(dashboard)/dashboard/endpoint/page.tsx";
const API_MANAGER_PAGE = "src/app/(dashboard)/dashboard/api-manager/page.tsx";
const API_ENDPOINTS_PAGE = "src/app/(dashboard)/dashboard/api-endpoints/page.tsx";
const API_MANAGER_CLIENT = "src/app/(dashboard)/dashboard/api-manager/ApiManagerPageClient.tsx";
const CATALOG_TAB = "src/app/(dashboard)/dashboard/endpoint/ApiEndpointsTab.tsx";

describe("0088 Endpoint fusion route + stack order", () => {
  it("creates /operations/endpoints fusion page and client", () => {
    assert.equal(existsSync(join(ROOT, FUSION_PAGE)), true);
    assert.equal(existsSync(join(ROOT, FUSION_CLIENT)), true);
    const page = read(FUSION_PAGE);
    assert.ok(page.includes("EndpointsFusionClient"));
    // Must not import/mount Ops topbar (comment mention of layout ownership is OK)
    assert.equal(/import\s+OperationsTopbar\b/.test(page), false);
    assert.equal(/<OperationsTopbar\b/.test(page), false);
  });

  it("fusion client stacks Keys → APIs → Catalog collapsibles in locked order", () => {
    const src = read(FUSION_CLIENT);
    assert.ok(src.includes('data-testid="endpoints-fusion"'));
    assert.ok(src.includes("data-endpoints-fusion"));
    assert.ok(src.includes('"api-keys"'));
    assert.ok(src.includes("ApiManagerPageClient"), "must import keys client (no copy-paste)");
    assert.ok(src.includes("EndpointPageClient"), "must import APIs body client");
    assert.ok(src.includes("ApiEndpointsTab"), "must import catalog tab");

    const keysIdx = src.indexOf('"api-keys"');
    const apisIdx = src.indexOf('"apis"');
    const catalogIdx = src.indexOf('"catalog"');
    assert.ok(keysIdx > 0 && apisIdx > keysIdx && catalogIdx > apisIdx, "order Keys → APIs → Catalog");

    // No dual/sub topbars on fusion body (imports / mounts only)
    assert.equal(/import\s+PageTabBar\b/.test(src) || /<PageTabBar\b/.test(src), false);
    assert.equal(/import\s+SegmentedControl\b/.test(src) || /<SegmentedControl\b/.test(src), false);
    assert.equal(/const ENDPOINT_TABS\b/.test(src), false);
    assert.equal(src.includes('data-testid="connect-protocol-homes"'), false);
    assert.equal(/import\s+OperationsTopbar\b/.test(src) || /<OperationsTopbar\b/.test(src), false);
    // No MCP/A2A dashboards fused into this peer
    assert.equal(src.includes("MCPDashboard"), false);
    assert.equal(src.includes("A2ADashboard"), false);
  });

  it("layout still owns exactly one OperationsTopbar (anti-phantom)", () => {
    const layout = read(LAYOUT);
    const mounts = layout.match(/<OperationsTopbar\b/g) ?? [];
    assert.equal(mounts.length, 1);
    const fusion = read(FUSION_CLIENT);
    assert.equal((fusion.match(/<OperationsTopbar\b/g) ?? []).length, 0);
    assert.equal((fusion.match(/import\s+OperationsTopbar\b/g) ?? []).length, 0);
    const fusionPage = read(FUSION_PAGE);
    assert.equal((fusionPage.match(/<OperationsTopbar\b/g) ?? []).length, 0);
    assert.equal((fusionPage.match(/import\s+OperationsTopbar\b/g) ?? []).length, 0);
  });
});

describe("0088 kill dual strip + protocol strip on Endpoint client", () => {
  it("EndpointPageClient has no ENDPOINT_TABS / SegmentedControl / protocol homes", () => {
    const src = read(ENDPOINT_CLIENT);
    assert.equal(/const ENDPOINT_TABS\b/.test(src), false, "no ENDPOINT_TABS array");
    assert.equal(/import\s+\{[^}]*SegmentedControl/.test(src) || /<SegmentedControl\b/.test(src), false);
    assert.equal(src.includes('data-testid="connect-protocol-homes"'), false);
    assert.equal(src.includes("writeTabSearchParam"), false);
    assert.equal(/import\s+ApiEndpointsTab\b/.test(src), false, "catalog not mounted in APIs body");
    assert.equal(/import\s+NotionSourceCard\b/.test(src), false, "context-sources left Endpoint");
    assert.ok(src.includes('data-testid="endpoint-apis-body"'));
  });

  it("clients for keys + catalog still exist for fusion imports", () => {
    assert.equal(existsSync(join(ROOT, API_MANAGER_CLIENT)), true);
    assert.equal(existsSync(join(ROOT, CATALOG_TAB)), true);
  });
});

describe("0088 legacy redirects use 0086 builders only", () => {
  it("api-manager redirects via buildOperationsPath(endpoints)", () => {
    const src = read(API_MANAGER_PAGE);
    assert.ok(src.includes("redirect("));
    assert.ok(src.includes("buildOperationsPath"));
    assert.ok(src.includes('"endpoints"') || src.includes("'endpoints'"));
    assert.equal(src.includes("ApiManagerPageClient"), false, "redirect shell only");
  });

  it("endpoint page redirects apis/catalog/default to endpoints; context to integrations", () => {
    const src = read(ENDPOINT_PAGE);
    assert.ok(src.includes("redirect("));
    assert.ok(src.includes("buildOperationsPath"));
    assert.ok(src.includes('"endpoints"') || src.includes("'endpoints'"));
    assert.ok(src.includes('"integrations"') || src.includes("'integrations'"));
    assert.ok(src.includes("context-sources") || src.includes("context"));
    // Intermediate protocol homes until 0089/0092
    assert.ok(src.includes('redirect("/dashboard/mcp")') || src.includes("tab === \"mcp\""));
    assert.ok(src.includes('redirect("/dashboard/a2a")') || src.includes("tab === \"a2a\""));
    assert.equal(/import\s+EndpointPageClient\b/.test(src), false, "redirect shell only");
    assert.equal(/<EndpointPageClient\b/.test(src), false, "redirect shell only");
  });

  it("api-endpoints redirects via CONNECT_CATALOG_SSOT_HREF", () => {
    const src = read(API_ENDPOINTS_PAGE);
    assert.ok(src.includes("redirect"));
    assert.ok(src.includes("CONNECT_CATALOG_SSOT_HREF"));
  });

  it("binary path asserts: matrix froms map to builder destinations", () => {
    const endpointsTo = buildOperationsPath("endpoints");
    const integrationsTo = buildOperationsPath("integrations");
    assert.equal(endpointsTo, "/operations/endpoints");
    assert.equal(integrationsTo, "/operations/integrations");

    const byFrom = new Map(OPERATIONS_REDIRECT_MATRIX.map((r) => [r.from, r]));

    for (const from of [
      "/dashboard/api-manager",
      "/dashboard/endpoint",
      "/dashboard/endpoint?tab=apis",
      CONNECT_CATALOG_LEGACY_HREF,
      CONNECT_RETIRED_API_ENDPOINTS_HREF,
    ]) {
      const row = byFrom.get(from);
      assert.ok(row, `matrix row missing for ${from}`);
      assert.equal(row!.to, endpointsTo, `${from} → endpoints`);
      assert.equal(row!.ownerTask, "0088");
    }

    const ctx = byFrom.get("/dashboard/endpoint?tab=context-sources");
    assert.ok(ctx);
    assert.equal(ctx!.to, integrationsTo);
  });

  it("CONNECT_CATALOG_SSOT_HREF is Operations endpoints builder path", () => {
    assert.equal(CONNECT_CATALOG_SSOT_HREF, buildOperationsPath("endpoints"));
    assert.equal(CONNECT_CATALOG_LEGACY_HREF, "/dashboard/endpoint?tab=catalog");
    assert.equal(CONNECT_RETIRED_API_ENDPOINTS_HREF, "/dashboard/api-endpoints");
  });
});

describe("0088 anti-leaf + no explainer wall as hub chrome", () => {
  it("adds 0 new primary sidebar leaves", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("endpoints"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("api-manager"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("api-catalog"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("api-endpoints"), false);
    // endpoints remains Operations topbar peer only
    assert.ok((OPERATIONS_TOPBAR_IDS as readonly string[]).includes("endpoints"));
  });

  it("fusion has no PageTabBar explainer as second topbar", () => {
    const src = read(FUSION_CLIENT);
    assert.equal(/import\s+PageTabBar\b/.test(src), false);
    assert.equal(/<PageTabBar\b/.test(src), false);
    // No dedicated wall explainer strip as peer chrome
    assert.equal(src.includes("data-testid=\"endpoints-explainer-wall\""), false);
  });
});

describe("0088 discovery surfaces use builders (path-to-100)", () => {
  it("CommandPalette api-manager + endpoints use buildOperationsPath(endpoints)", () => {
    const src = read("src/shared/components/CommandPalette.tsx");
    assert.ok(src.includes("buildOperationsPath"));
    assert.ok(
      src.includes('buildOperationsPath("endpoints")') ||
        src.includes("buildOperationsPath('endpoints')")
    );
    assert.ok(src.includes("#api-keys"), "keys item deep-links fusion block");
    assert.equal(src.includes('href: "/dashboard/api-manager"'), false);
    assert.equal(src.includes('href: "/dashboard/endpoint"'), false);
  });

  it("Header deep meta covers /operations/endpoints before catch-all", () => {
    const src = read("src/shared/components/Header.tsx");
    assert.ok(
      src.includes('matchOpsPeerPath("endpoints")') ||
        src.includes("/operations/endpoints") ||
        src.includes('"endpoints"')
    );
    const endpointsIdx = src.indexOf('matchOpsPeerPath("endpoints")');
    const catchAllIdx = src.indexOf("Hub root only");
    assert.ok(
      endpointsIdx >= 0 && catchAllIdx > endpointsIdx,
      "peer matcher before hub-root catch-all"
    );
  });
});
