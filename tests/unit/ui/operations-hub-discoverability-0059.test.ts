/**
 * Task 0059 — Operations hub IA.
 * Option A: `/dashboard/operations` hub; API Keys absorbed from primary leaves.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONNECT_CATALOG_SSOT_HREF,
  CONNECT_RETIRED_API_ENDPOINTS_HREF,
  HIDEABLE_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
  SIDEBAR_PRESETS,
  countPresetVisibleLeaves,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OPERATIONS_HUB_GROUPS,
  OPERATIONS_HUB_HREFS,
} from "../../../src/shared/constants/operationsHub";

const root = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("Operations primary leaf points to /dashboard/operations", () => {
  const ops = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "operations");
  assert.ok(ops, "operations primary leaf must exist");
  assert.equal(ops.href, "/dashboard/operations");
  assert.equal(ops.i18nKey, "operationsNav");
  assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("operations"));
});

test("API Keys is absorbed from primary leaves but remains hideable", () => {
  assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("api-manager"), false);
  assert.ok(HIDEABLE_SIDEBAR_ITEM_IDS.includes("api-manager"));
});

test("cli-code is no longer the Operations primary leaf", () => {
  assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("cli-code"), false);
  assert.ok(HIDEABLE_SIDEBAR_ITEM_IDS.includes("cli-code"));
});

test("Operations hub exposes all Task 0059 target routes", () => {
  const required = [
    "/dashboard/api-manager",
    "/dashboard/endpoint",
    // Single catalog SSoT (Task 0024) — retired path is NOT a hub peer
    CONNECT_CATALOG_SSOT_HREF,
    "/dashboard/mcp",
    "/dashboard/a2a",
    "/dashboard/cli-agents",
    "/dashboard/cli-code",
    "/dashboard/cloud-agents",
    "/dashboard/acp-agents",
    "/dashboard/tools/agent-bridge",
    "/dashboard/webhooks",
    "/dashboard/tools/traffic-inspector",
    "/dashboard/memory",
    "/dashboard/agent-skills",
    "/dashboard/omni-skills",
  ];
  for (const href of required) {
    assert.ok(
      OPERATIONS_HUB_HREFS.includes(href),
      `Operations hub missing href: ${href}`
    );
  }
  // S5 guard: legacy redirect path must not reappear as a discovery peer
  assert.equal(
    OPERATIONS_HUB_HREFS.includes(CONNECT_RETIRED_API_ENDPOINTS_HREF),
    false,
    "Operations hub must not dual-home catalog via retired /dashboard/api-endpoints"
  );
  assert.equal(OPERATIONS_HUB_GROUPS.length, 3);
  assert.deepEqual(
    OPERATIONS_HUB_GROUPS.map((g) => g.id),
    ["api-endpoints", "agents", "integrations"]
  );
});

test("operations page and client exist and compose hub groups", () => {
  const page = read("src/app/(dashboard)/dashboard/operations/page.tsx");
  assert.ok(page.includes("OperationsHubClient"));
  const client = read("src/app/(dashboard)/dashboard/operations/OperationsHubClient.tsx");
  assert.ok(client.includes("OPERATIONS_HUB_GROUPS"));
  assert.ok(client.includes('data-testid="operations-hub"'));
  assert.ok(client.includes("data-operations-hub-link"));
  // Destinations live in operationsHub constants (not duplicated as string literals in client)
  assert.ok(OPERATIONS_HUB_HREFS.includes("/dashboard/api-manager"));
  assert.ok(OPERATIONS_HUB_HREFS.includes("/dashboard/endpoint"));
  assert.ok(OPERATIONS_HUB_HREFS.includes("/dashboard/mcp"));
  assert.ok(OPERATIONS_HUB_HREFS.includes("/dashboard/cli-code"));
  assert.ok(OPERATIONS_HUB_HREFS.includes("/dashboard/webhooks"));
});

test("deep-link routes still exist as real pages", () => {
  const apiManager = read("src/app/(dashboard)/dashboard/api-manager/page.tsx");
  assert.ok(apiManager.includes("ApiManagerPageClient"));
  assert.equal(apiManager.includes('redirect("'), false);

  const endpoint = read("src/app/(dashboard)/dashboard/endpoint/page.tsx");
  assert.ok(endpoint.includes("EndpointPageClient"));
  // Conditional redirects for tab=mcp/a2a only — page still serves endpoint content
  assert.ok(endpoint.includes('redirect("/dashboard/mcp")'));
  assert.ok(endpoint.includes('redirect("/dashboard/a2a")'));

  for (const rel of [
    "src/app/(dashboard)/dashboard/mcp/page.tsx",
    "src/app/(dashboard)/dashboard/a2a/page.tsx",
    "src/app/(dashboard)/dashboard/cli-code/page.tsx",
    "src/app/(dashboard)/dashboard/webhooks/page.tsx",
  ]) {
    const src = read(rel);
    assert.ok(src.length > 20, `expected non-empty ${rel}`);
  }
});

test("role presets still keep ≤10 primary leaves and include operations", () => {
  const minimal = countPresetVisibleLeaves("minimal");
  const developer = countPresetVisibleLeaves("developer");
  const admin = countPresetVisibleLeaves("admin");
  assert.ok(minimal <= 10, `minimal=${minimal}`);
  assert.ok(developer <= 10, `developer=${developer}`);
  assert.equal(admin, PRIMARY_SIDEBAR_ITEM_IDS.length);

  const minimalPreset = SIDEBAR_PRESETS.find((p) => p.id === "minimal");
  assert.ok(minimalPreset);
  assert.equal(minimalPreset.hiddenItems.includes("operations"), false);
});

test("CommandPalette includes Operations hub destinations", () => {
  const src = read("src/shared/components/CommandPalette.tsx");
  assert.ok(src.includes('href: "/dashboard/api-manager"'));
  assert.ok(src.includes('href: "/dashboard/mcp"'));
  assert.ok(src.includes('href: "/dashboard/cli-code"'));
  assert.ok(src.includes("operationsHubExtras"));
});

test("401 page still deep-links API manager", () => {
  const src = read("src/app/401/page.tsx");
  assert.ok(src.includes('href: "/dashboard/api-manager"'));
});

test("Header maps operations description key", () => {
  const src = read("src/shared/components/Header.tsx");
  assert.ok(src.includes("operations: \"operationsDescription\"") || src.includes('operations: "operationsDescription"'));
  assert.ok(src.includes("OPERATIONS_DEEP_HEADER_META"));
});

test("Header traffic-inspector uses trafficInspectorDescription (not cliTools)", () => {
  const src = read("src/shared/components/Header.tsx");
  assert.ok(src.includes('descKey: "trafficInspectorDescription"'));
  // Guard: traffic-inspector block must not reuse CLI tools copy.
  const tiBlock = src.slice(
    src.indexOf('titleKey: "trafficInspector"'),
    src.indexOf('titleKey: "trafficInspector"') + 280
  );
  assert.ok(tiBlock.includes("trafficInspectorDescription"));
  assert.ok(!tiBlock.includes('descKey: "cliToolsDescription"'));

  const en = JSON.parse(read("src/i18n/messages/en.json")) as {
    header?: Record<string, string>;
  };
  assert.ok(en.header?.trafficInspectorDescription);
  assert.notEqual(en.header?.trafficInspectorDescription, en.header?.cliToolsDescription);
});

test("Header agent-bridge uses agentBridgeDescription", () => {
  const src = read("src/shared/components/Header.tsx");
  const block = src.slice(
    src.indexOf('titleKey: "agentBridge"'),
    src.indexOf('titleKey: "agentBridge"') + 280
  );
  assert.ok(block.includes('descKey: "agentBridgeDescription"'));
  const en = JSON.parse(read("src/i18n/messages/en.json")) as {
    header?: Record<string, string>;
  };
  assert.ok(en.header?.agentBridgeDescription);
});
