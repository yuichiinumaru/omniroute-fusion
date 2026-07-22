/**
 * Task 0086 / EPIC-20 T20-A — freeze Operations topbar ids + path builders + redirect matrix.
 * No chrome mount / product routes yet (0087+).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
  CONNECT_CATALOG_SSOT_HREF,
  CONNECT_RETIRED_API_ENDPOINTS_HREF,
} from "../../../src/shared/constants/sidebarVisibility";
import { OPERATIONS_HUB_HREFS } from "../../../src/shared/constants/operationsHub";
import {
  TESTING_HUB_GROUPS,
  TESTING_HUB_LEGACY_HREFS,
} from "../../../src/shared/constants/testingHub";
import { OBSERVE_HUB_PATH, OBSERVE_SOURCES, isObserveSource } from "../../../src/shared/constants/observeHub";
import {
  EPIC20_FORBIDDEN_ENDPOINT_SUBTOPBAR_IDS,
  EPIC20_FORBIDDEN_MEMORY_SUBTOPBAR_IDS,
  EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS,
  EPIC20_FORBIDDEN_PROTOCOL_SUBTOPBAR_IDS,
  EPIC20_TRAFFIC_INSPECTOR_PATH,
  OBSERVE_TRAFFIC_PANEL,
  OPERATIONS_DEFAULT_TOPBAR_ID,
  OPERATIONS_HUB_PATH,
  OPERATIONS_REDIRECT_MATRIX,
  OPERATIONS_TOPBAR_IDS,
  OPERATIONS_TOPBAR_LABELS,
  buildObserveTrafficInspectorPath,
  buildOperationsDefaultPath,
  buildOperationsHubPath,
  buildOperationsPath,
  isOperationsTopbarId,
  type Epic20RedirectEntry,
  type OperationsTopbarId,
} from "../../../src/shared/constants/epic20Operations";

const ROOT = join(import.meta.dirname, "../../..");

describe("EPIC-20 Operations topbar — mandatory freeze (exactly 10 peers)", () => {
  it("exports OPERATIONS_TOPBAR_IDS length 10 in Epic §2 order", () => {
    assert.equal(OPERATIONS_TOPBAR_IDS.length, 10);
    assert.deepEqual([...OPERATIONS_TOPBAR_IDS], [
      "endpoints",
      "core-mcp",
      "agents",
      "cloud-agents",
      "a2a-acp-bridge",
      "skills",
      "integrations",
      "memory",
      "labs",
      "media",
    ]);
  });

  it("labels map covers every topbar id (Epic §2 labels)", () => {
    const expected: Record<OperationsTopbarId, string> = {
      endpoints: "Endpoint",
      "core-mcp": "CoreMCP",
      agents: "Agents",
      "cloud-agents": "Cloud Agents",
      "a2a-acp-bridge": "A2A/ACP Bridge",
      skills: "Skills",
      integrations: "Integrations",
      memory: "Memory",
      labs: "Labs",
      media: "Media",
    };
    for (const id of OPERATIONS_TOPBAR_IDS) {
      assert.equal(OPERATIONS_TOPBAR_LABELS[id], expected[id]);
      assert.equal(isOperationsTopbarId(id), true);
    }
    assert.equal(isOperationsTopbarId("testing"), false);
    assert.equal(isOperationsTopbarId("mcp"), false);
    assert.equal(isOperationsTopbarId("traffic"), false);
  });

  it("default topbar id is endpoints (shell selection only)", () => {
    assert.equal(OPERATIONS_DEFAULT_TOPBAR_ID, "endpoints");
    assert.ok(isOperationsTopbarId(OPERATIONS_DEFAULT_TOPBAR_ID));
  });
});

describe("EPIC-20 path builders — single shape /operations/{id}", () => {
  it("hub root is /operations (not /operations/endpoints)", () => {
    assert.equal(OPERATIONS_HUB_PATH, "/operations");
    assert.equal(buildOperationsHubPath(), "/operations");
    assert.equal(buildOperationsHubPath(), OPERATIONS_HUB_PATH);
    assert.notEqual(buildOperationsHubPath(), buildOperationsDefaultPath());
  });

  it("buildOperationsPath(id) → /operations/{id} for all 10 peers", () => {
    for (const id of OPERATIONS_TOPBAR_IDS) {
      const path = buildOperationsPath(id);
      assert.equal(path, `/operations/${id}`);
      assert.ok(path.startsWith("/operations/"));
      assert.ok(!path.includes("?"), `${path} must not use query as path shape`);
      assert.ok(!path.startsWith("/dashboard/"), `${path} must not use legacy /dashboard host`);
    }
  });

  it("default peer path is /operations/endpoints", () => {
    assert.equal(buildOperationsDefaultPath(), "/operations/endpoints");
    assert.equal(buildOperationsDefaultPath(), buildOperationsPath("endpoints"));
  });

  it("does not offer dual host /dashboard/operations/{id} as builder product", () => {
    for (const id of OPERATIONS_TOPBAR_IDS) {
      const path = buildOperationsPath(id);
      assert.equal(path.includes("/dashboard/"), false);
    }
  });
});

describe("EPIC-20 Traffic Inspector → Observe (one frozen string)", () => {
  it("freezes EPIC20_TRAFFIC_INSPECTOR_PATH = /dashboard/activity?panel=traffic", () => {
    assert.equal(EPIC20_TRAFFIC_INSPECTOR_PATH, "/dashboard/activity?panel=traffic");
    assert.equal(buildObserveTrafficInspectorPath(), EPIC20_TRAFFIC_INSPECTOR_PATH);
    assert.equal(buildObserveTrafficInspectorPath(), `${OBSERVE_HUB_PATH}?panel=${OBSERVE_TRAFFIC_PANEL}`);
  });

  it("traffic panel is not an Observe log source and not an Operations topbar id", () => {
    assert.equal(isObserveSource(OBSERVE_TRAFFIC_PANEL), false);
    assert.ok(!(OBSERVE_SOURCES as readonly string[]).includes(OBSERVE_TRAFFIC_PANEL));
    assert.equal(isOperationsTopbarId(OBSERVE_TRAFFIC_PANEL), false);
    assert.equal(isOperationsTopbarId("traffic-inspector"), false);
  });

  it("Traffic Inspector destination is NOT under /operations", () => {
    assert.ok(!EPIC20_TRAFFIC_INSPECTOR_PATH.startsWith("/operations"));
    assert.ok(EPIC20_TRAFFIC_INSPECTOR_PATH.startsWith(OBSERVE_HUB_PATH));
  });
});

describe("OPERATIONS_REDIRECT_MATRIX — from→to + builder alignment", () => {
  it("covers Epic §5 core rows + inventory aliases", () => {
    const froms = OPERATIONS_REDIRECT_MATRIX.map((r) => r.from);
    for (const required of [
      "/dashboard/operations",
      "/dashboard/api-manager",
      "/dashboard/endpoint",
      "/dashboard/endpoint?tab=apis",
      "/dashboard/endpoint?tab=catalog", // CONNECT_CATALOG_LEGACY_HREF (0088)
      CONNECT_RETIRED_API_ENDPOINTS_HREF,
      "/dashboard/endpoint?tab=context-sources",
      "/dashboard/mcp",
      "/dashboard/cli-agents",
      "/dashboard/cli-code",
      "/dashboard/cloud-agents",
      "/dashboard/tools/agent-bridge",
      "/dashboard/a2a",
      "/dashboard/acp-agents",
      "/dashboard/omni-skills",
      "/dashboard/agent-skills",
      "/dashboard/webhooks",
      "/dashboard/plugins",
      "/dashboard/memory",
      "/dashboard/memory?tab=memories",
      "/dashboard/memory?tab=engine",
      "/dashboard/memory?tab=playground",
      "/dashboard/playground",
      "/dashboard/translator",
      "/dashboard/search-tools",
      "/dashboard/batch",
      "/dashboard/batch/files",
      "/dashboard/testing",
      "/dashboard/cache/media",
      "/dashboard/tools/traffic-inspector",
    ]) {
      assert.ok(froms.includes(required), `matrix missing from=${required}`);
    }
  });

  it("every matrix `to` matches a canonical builder (no divergent ad-hoc strings)", () => {
    const allowedTos = new Set<string>([
      buildOperationsHubPath(),
      ...OPERATIONS_TOPBAR_IDS.map((id) => buildOperationsPath(id)),
      buildObserveTrafficInspectorPath(),
    ]);

    for (const entry of OPERATIONS_REDIRECT_MATRIX) {
      assert.ok(
        allowedTos.has(entry.to),
        `from=${entry.from} to=${entry.to} is not a builder product`
      );
    }
  });

  it("single shape per destination family (no dual nested vs alternate hosts)", () => {
    for (const entry of OPERATIONS_REDIRECT_MATRIX) {
      if (entry.hub === "operations") {
        assert.ok(
          entry.to === "/operations" || entry.to.startsWith("/operations/"),
          `ops to must be /operations* : ${entry.to}`
        );
        assert.ok(!entry.to.startsWith("/dashboard/operations"), entry.to);
      } else if (entry.hub === "observe") {
        assert.equal(entry.to, buildObserveTrafficInspectorPath());
        assert.ok(entry.to.includes("panel=traffic"));
        assert.ok(!entry.to.includes("source=traffic"));
      }
    }
  });

  it("every matrix `from` is unique", () => {
    const froms = OPERATIONS_REDIRECT_MATRIX.map((r) => r.from);
    assert.equal(froms.length, new Set(froms).size, "duplicate from= rows");
  });

  it("matrix rows are readonly-shaped entries with hub + from + to + ownerTask", () => {
    for (const entry of OPERATIONS_REDIRECT_MATRIX as readonly Epic20RedirectEntry[]) {
      assert.equal(typeof entry.from, "string");
      assert.equal(typeof entry.to, "string");
      assert.ok(["operations", "observe"].includes(entry.hub));
      assert.ok(entry.from.length > 0);
      assert.ok(entry.to.length > 0);
      assert.ok(typeof entry.ownerTask === "string" && entry.ownerTask.length > 0);
    }
  });

  it("maps every live Operations hub legacy href to a matrix row", () => {
    // Canonical `/operations/*` peer cards are destinations (not legacy `from` rows).
    // Hash fragments (#section) are in-page L1 anchors on fused peers.
    const froms = new Set(OPERATIONS_REDIRECT_MATRIX.map((r) => r.from));
    for (const href of OPERATIONS_HUB_HREFS) {
      const pathOnly = href.split("#")[0] ?? href;
      if (pathOnly === "/operations" || pathOnly.startsWith("/operations/")) {
        continue;
      }
      assert.ok(
        froms.has(href) || froms.has(pathOnly),
        `OPERATIONS_HUB_HREFS href missing from matrix: ${href}`
      );
    }
  });

  it("maps every legacy Testing hub lab/media/plugins/testing path to a matrix row", () => {
    const froms = new Set(OPERATIONS_REDIRECT_MATRIX.map((r) => r.from));
    // 0099: TESTING_HUB_GROUPS hrefs are canonical Ops paths; matrix covers LEGACY froms.
    for (const href of TESTING_HUB_LEGACY_HREFS) {
      assert.ok(froms.has(href), `TESTING_HUB legacy href missing from matrix: ${href}`);
    }
    // Absorb map still enumerates the seven surfaces (archive inventory).
    assert.equal(TESTING_HUB_GROUPS.flatMap((g) => g.links).length, 7);
  });

  it("context-sources lands on integrations (not endpoints)", () => {
    const row = OPERATIONS_REDIRECT_MATRIX.find(
      (e) => e.from === "/dashboard/endpoint?tab=context-sources"
    );
    assert.ok(row);
    assert.equal(row!.to, buildOperationsPath("integrations"));
  });

  it("catalog aliases land on endpoints", () => {
    // 0088: discovery SSoT is Operations endpoints; matrix from is legacy tab path
    assert.equal(CONNECT_CATALOG_SSOT_HREF, buildOperationsPath("endpoints"));
    const legacyCatalog = "/dashboard/endpoint?tab=catalog";
    for (const from of [legacyCatalog, CONNECT_RETIRED_API_ENDPOINTS_HREF]) {
      const row = OPERATIONS_REDIRECT_MATRIX.find((e) => e.from === from);
      assert.ok(row, from);
      assert.equal(row!.to, buildOperationsPath("endpoints"));
    }
  });

  it("testing hub lands on labs (not media)", () => {
    const row = OPERATIONS_REDIRECT_MATRIX.find((e) => e.from === "/dashboard/testing");
    assert.ok(row);
    assert.equal(row!.to, buildOperationsPath("labs"));
  });

  it("traffic-inspector lands on Observe builder only", () => {
    const row = OPERATIONS_REDIRECT_MATRIX.find(
      (e) => e.from === "/dashboard/tools/traffic-inspector"
    );
    assert.ok(row);
    assert.equal(row!.hub, "observe");
    assert.equal(row!.to, buildObserveTrafficInspectorPath());
    assert.equal(row!.ownerTask, "0098");
  });
});

describe("EPIC-20 anti-leaf + anti multi-topbar law", () => {
  it("does not introduce primary leaves for ops peers / labs / testing / mcp / media", () => {
    for (const id of EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS) {
      assert.ok(
        !(PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes(id),
        `live primary must not include forbidden id: ${id}`
      );
    }
    // Still exactly one Operations leaf
    assert.equal(
      PRIMARY_SIDEBAR_ITEMS.filter((i) => i.id === "operations").length,
      1
    );
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
  });

  it("anti multi-topbar: only one Operations topbar peer list (10 ids)", () => {
    // Segment-2 = OPERATIONS_TOPBAR_IDS only — forbidden sub-topbar families
    // must not appear as topbar peers.
    const peerSet = new Set<string>(OPERATIONS_TOPBAR_IDS);
    for (const id of EPIC20_FORBIDDEN_ENDPOINT_SUBTOPBAR_IDS) {
      assert.ok(!peerSet.has(id), `endpoint sub-tab ${id} must not be topbar peer`);
    }
    for (const id of EPIC20_FORBIDDEN_PROTOCOL_SUBTOPBAR_IDS) {
      assert.ok(!peerSet.has(id), `protocol strip ${id} must not be topbar peer`);
    }
    for (const id of EPIC20_FORBIDDEN_MEMORY_SUBTOPBAR_IDS) {
      assert.ok(!peerSet.has(id), `memory tab ${id} must not be topbar peer`);
    }
    // Exactly one peer list length
    assert.equal(OPERATIONS_TOPBAR_IDS.length, 10);
    assert.equal(Object.keys(OPERATIONS_TOPBAR_LABELS).length, 10);
  });

  it("canonical peer paths never encode Endpoint dual-strip or protocol strip as path segment", () => {
    for (const id of [
      ...EPIC20_FORBIDDEN_ENDPOINT_SUBTOPBAR_IDS,
      ...EPIC20_FORBIDDEN_PROTOCOL_SUBTOPBAR_IDS,
    ]) {
      assert.equal(
        OPERATIONS_TOPBAR_IDS.includes(id as OperationsTopbarId),
        false
      );
      const accidental = `/operations/${id}`;
      for (const peer of OPERATIONS_TOPBAR_IDS) {
        assert.notEqual(buildOperationsPath(peer), accidental);
      }
    }
  });

  it("docs planned section asserts single topbar (not dual Endpoint strips)", () => {
    const uiMd = readFileSync(join(ROOT, "docs/guides/UI.md"), "utf8");
    assert.ok(
      uiMd.includes("## EPIC-20 Operations hub reform (planned)"),
      "UI.md must contain EPIC-20 planned section"
    );
    const section = uiMd.split("## EPIC-20 Operations hub reform (planned)")[1]?.split("\n## ")[0] ?? "";
    assert.ok(
      /exactly one/i.test(section),
      "section must state single topbar law (exactly one)"
    );
    assert.ok(section.includes("/operations/"), "section must document /operations/{id}");
    assert.ok(
      /traffic/i.test(section),
      "section must document Traffic out of Ops"
    );
    assert.ok(
      !section.includes("/operations/apis") && !section.includes("/operations/catalog"),
      "must not invent Endpoint sub-topbar paths"
    );
  });
});
