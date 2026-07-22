/**
 * Task 0059 — Operations hub IA (EPIC-20 deep-link inventory / 0099).
 * Option A: Operations hub; API Keys absorbed from primary leaves.
 * Cards deep-link `/operations/{topbar-id}` peers (Labs + Media required).
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
import { buildOperationsPath } from "../../../src/shared/constants/epic20Operations";

const root = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(root, rel), "utf8");
}

test("Operations primary leaf points to /operations (EPIC-20 / 0087)", () => {
  const ops = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "operations");
  assert.ok(ops, "operations primary leaf must exist");
  assert.equal(ops.href, "/operations");
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

test("Operations hub exposes EPIC-20 topbar deep-link destinations", () => {
  const required = [
    buildOperationsPath("endpoints"),
    CONNECT_CATALOG_SSOT_HREF,
    buildOperationsPath("core-mcp"),
    buildOperationsPath("a2a-acp-bridge"),
    buildOperationsPath("agents"),
    buildOperationsPath("cloud-agents"),
    buildOperationsPath("integrations"),
    buildOperationsPath("memory"),
    buildOperationsPath("skills"),
    buildOperationsPath("labs"),
    buildOperationsPath("media"),
  ];
  for (const href of required) {
    const hit =
      OPERATIONS_HUB_HREFS.includes(href) ||
      OPERATIONS_HUB_HREFS.some((h) => h === href || h.startsWith(`${href}#`));
    assert.ok(hit, `Operations hub missing href: ${href}`);
  }
  // S5 guard: legacy redirect path must not reappear as a discovery peer
  assert.equal(
    OPERATIONS_HUB_HREFS.includes(CONNECT_RETIRED_API_ENDPOINTS_HREF),
    false,
    "Operations hub must not dual-home catalog via retired /dashboard/api-endpoints"
  );
  // EPIC-20 T20-M: Traffic is Observe, not Ops Integrations
  assert.equal(
    OPERATIONS_HUB_HREFS.includes("/dashboard/tools/traffic-inspector"),
    false,
    "Operations hub must not present Traffic Inspector (moved to Observe)"
  );
  // EPIC-20 / 0099: Testing hub retired
  assert.equal(
    OPERATIONS_HUB_HREFS.includes("/dashboard/testing"),
    false,
    "Operations hub must not deep-link retired Testing hub"
  );
  assert.equal(OPERATIONS_HUB_GROUPS.length, 3);
  assert.deepEqual(
    OPERATIONS_HUB_GROUPS.map((g) => g.id),
    ["api-endpoints", "agents", "integrations"]
  );
});

test("operations page and client exist and compose hub groups", () => {
  // EPIC-20: canonical hub under /operations; legacy /dashboard/operations redirects.
  const legacy = read("src/app/(dashboard)/dashboard/operations/page.tsx");
  assert.ok(legacy.includes("redirect("));
  assert.ok(legacy.includes("buildOperationsHubPath"));

  const page = read("src/app/(dashboard)/operations/page.tsx");
  assert.ok(page.includes("OperationsHubClient"));
  const client = read("src/app/(dashboard)/operations/OperationsHubClient.tsx");
  assert.ok(client.includes("OPERATIONS_HUB_GROUPS"));
  assert.ok(client.includes('data-testid="operations-hub"'));
  assert.ok(client.includes("data-operations-hub-link"));
  // Destinations live in operationsHub constants (not duplicated as string literals in client)
  assert.ok(OPERATIONS_HUB_HREFS.includes(buildOperationsPath("endpoints")));
  assert.ok(OPERATIONS_HUB_HREFS.includes(buildOperationsPath("core-mcp")));
  assert.ok(
    OPERATIONS_HUB_HREFS.some(
      (h) => h === buildOperationsPath("agents") || h.startsWith(`${buildOperationsPath("agents")}#`)
    )
  );
  assert.ok(OPERATIONS_HUB_HREFS.includes(buildOperationsPath("integrations")));
  assert.ok(OPERATIONS_HUB_HREFS.includes(buildOperationsPath("labs")));
  assert.ok(OPERATIONS_HUB_HREFS.includes(buildOperationsPath("media")));
});

test("deep-link routes still exist as real pages", () => {
  // EPIC-20 / 0088: API Keys is redirect shell into Endpoint fusion
  const apiManager = read("src/app/(dashboard)/dashboard/api-manager/page.tsx");
  assert.ok(apiManager.includes("redirect"));
  assert.ok(
    apiManager.includes("buildOperationsPath") ||
      apiManager.includes("endpoints") ||
      apiManager.includes("ApiManagerPageClient")
  );

  const endpoint = read("src/app/(dashboard)/dashboard/endpoint/page.tsx");
  assert.ok(endpoint.length > 20, "endpoint page must exist");

  // EPIC-20 / 0089: legacy mcp is redirect shell; body is CoreMCP peer
  const legacyMcp = read("src/app/(dashboard)/dashboard/mcp/page.tsx");
  assert.ok(legacyMcp.includes("redirect("));
  assert.ok(legacyMcp.includes("buildOperationsPath"));
  const coreMcp = read("src/app/(dashboard)/operations/core-mcp/page.tsx");
  assert.ok(coreMcp.includes("CoreMcpPageClient"));

  for (const rel of [
    "src/app/(dashboard)/dashboard/a2a/page.tsx",
    "src/app/(dashboard)/dashboard/cli-code/page.tsx",
    "src/app/(dashboard)/dashboard/webhooks/page.tsx",
  ]) {
    const src = read(rel);
    assert.ok(src.length > 20, `expected non-empty ${rel}`);
  }
  // EPIC-20 / 0090: legacy cli list pages are redirect shells; fusion is /operations/agents
  const legacyCliCode = read("src/app/(dashboard)/dashboard/cli-code/page.tsx");
  assert.ok(legacyCliCode.includes("redirect("));
  assert.ok(legacyCliCode.includes("buildOperationsPath"));
  const agentsFusion = read("src/app/(dashboard)/operations/agents/page.tsx");
  assert.ok(agentsFusion.includes("AgentsFusionClient"));
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
  // EPIC-20: destinations use builders (endpoints / core-mcp / agents) or legacy until fused
  assert.ok(src.includes("buildOperationsPath"));
  assert.ok(src.includes("core-mcp"));
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

test("Header agent-bridge / A2A legacy paths map to A2A/ACP Bridge peer", () => {
  const src = read("src/shared/components/Header.tsx");
  // EPIC-20 / 0092: agent-bridge + a2a + acp-agents share A2A/ACP Bridge header meta
  assert.ok(src.includes("/dashboard/tools/agent-bridge"));
  assert.ok(src.includes('titleKey: "a2aAcpBridge"') || src.includes("a2aAcpBridge"));
  const en = JSON.parse(read("src/i18n/messages/en.json")) as {
    header?: Record<string, string>;
    sidebar?: Record<string, string>;
  };
  // Prefer dedicated bridge desc when present; a2aDescription is acceptable fusion copy
  assert.ok(
    en.header?.agentBridgeDescription || en.header?.a2aDescription,
    "header must retain a2a or agentBridge description key"
  );
});
