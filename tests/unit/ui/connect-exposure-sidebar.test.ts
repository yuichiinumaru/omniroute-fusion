import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS,
  SIDEBAR_SECTIONS,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";

const repoRoot = join(import.meta.dirname, "../../..");

/**
 * Epic 0005 S5 — Connect / Registry exposure cleanup.
 * Epic 0005 S6 — exposures live under Registry pillar.
 * Single homes for MCP, A2A, API Connect; no triple sidebar peers.
 */

function sectionItems(sectionId: string) {
  const section = SIDEBAR_SECTIONS.find((candidate) => candidate.id === sectionId);
  assert.ok(section, `expected ${sectionId} sidebar section to exist`);
  return getSectionItems(section);
}

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

describe("default sidebar has single Connect + single MCP/A2A homes", () => {
  it("Registry keeps endpoints (Connect SSoT) and drops api-endpoints leaf", () => {
    const ids = sectionItems("registry").map((item) => item.id);
    assert.ok(ids.includes("endpoints"), "endpoints (Connect) must remain default-visible");
    assert.ok(!ids.includes("api-endpoints"), "api-endpoints must not be a default leaf");
    assert.ok(ids.includes("webhooks"), "webhooks remains under Exposures");
  });

  it("Governance keeps api-manager (keys) separate from Registry", () => {
    const govIds = sectionItems("governance").map((item) => item.id);
    assert.ok(govIds.includes("api-manager"), "api-manager (keys) under governance");
    const regIds = sectionItems("registry").map((item) => item.id);
    assert.ok(!regIds.includes("api-manager"), "api-manager not duplicated under registry");
  });

  it("Registry is the only default home for mcp + a2a", () => {
    const registryIds = sectionItems("registry").map((item) => item.id);
    assert.ok(registryIds.includes("mcp"), "mcp SSoT under registry");
    assert.ok(registryIds.includes("a2a"), "a2a SSoT under registry");

    const allDefaultIds = SIDEBAR_SECTIONS.flatMap((section) =>
      getSectionItems(section).map((item) => item.id)
    );
    assert.equal(
      allDefaultIds.filter((id) => id === "mcp").length,
      1,
      "mcp must appear exactly once in default tree"
    );
    assert.equal(
      allDefaultIds.filter((id) => id === "a2a").length,
      1,
      "a2a must appear exactly once in default tree"
    );
  });

  it("canonical hrefs for Connect / MCP / A2A / keys", () => {
    const endpoints = sectionItems("registry").find((item) => item.id === "endpoints");
    const apiManager = sectionItems("governance").find((item) => item.id === "api-manager");
    const mcp = sectionItems("registry").find((item) => item.id === "mcp");
    const a2a = sectionItems("registry").find((item) => item.id === "a2a");

    assert.equal(endpoints?.href, "/dashboard/endpoint");
    assert.equal(apiManager?.href, "/dashboard/api-manager");
    assert.equal(mcp?.href, "/dashboard/mcp");
    assert.equal(a2a?.href, "/dashboard/a2a");
  });
});

describe("Connect exposure redirects", () => {
  it("api-endpoints page redirects to endpoint?tab=catalog", async () => {
    const page = await readFile(
      join(repoRoot, "src/app/(dashboard)/dashboard/api-endpoints/page.tsx"),
      "utf8"
    );
    assert.match(page, /redirect\("\/dashboard\/endpoint\?tab=catalog"\)/);
  });

  it("endpoint page redirects legacy ?tab=mcp and ?tab=a2a to protocol homes", async () => {
    const page = await readFile(
      join(repoRoot, "src/app/(dashboard)/dashboard/endpoint/page.tsx"),
      "utf8"
    );
    assert.match(page, /tab === "mcp"/);
    assert.match(page, /redirect\("\/dashboard\/mcp"\)/);
    assert.match(page, /tab === "a2a"/);
    assert.match(page, /redirect\("\/dashboard\/a2a"\)/);
  });

  it("endpoint shell no longer embeds MCP/A2A dashboards as peer tabs", async () => {
    const client = await readFile(
      join(repoRoot, "src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.tsx"),
      "utf8"
    );
    assert.doesNotMatch(client, /import McpDashboardPage/);
    assert.doesNotMatch(client, /import A2ADashboardPage/);
    assert.match(client, /type EndpointTab = "apis" \| "catalog" \| "context-sources"/);
    assert.match(client, /data-testid="connect-protocol-homes"/);
    assert.match(client, /href="\/dashboard\/mcp"/);
    assert.match(client, /href="\/dashboard\/a2a"/);
    assert.match(client, /ApiEndpointsTab/);
    assert.match(client, /writeTabSearchParam\("tab"/);
    assert.match(client, /aria-label=\{[\s\S]*MCP offline/);
    assert.match(client, /role="navigation"/);
  });
});
