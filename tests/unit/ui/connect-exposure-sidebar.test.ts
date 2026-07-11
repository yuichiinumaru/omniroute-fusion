import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  CONNECT_EXPOSURE_RETIRED_SIDEBAR_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
  SIDEBAR_SECTIONS,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";

const repoRoot = join(import.meta.dirname, "../../..");

/**
 * Flat primary nav: exposures nest under Providers hub on-page.
 * MCP/A2A routes remain SSoT; not every protocol is a peer sidebar leaf.
 */

function defaultLeafIds(): string[] {
  return SIDEBAR_SECTIONS.filter((s) => s.visibility !== "debug").flatMap((section) =>
    getSectionItems(section).map((item) => item.id)
  );
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

describe("default flat sidebar connect/exposure policy", () => {
  const leafIds = defaultLeafIds();

  it("providers + api-manager are primary hubs", () => {
    assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("providers"));
    assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("api-manager"));
    assert.ok(leafIds.includes("providers"));
    assert.ok(leafIds.includes("api-manager"));
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

describe("Connect route files still implement redirects", () => {
  it("api-endpoints page redirects to catalog", async () => {
    const src = await readFile(
      join(repoRoot, "src/app/(dashboard)/dashboard/api-endpoints/page.tsx"),
      "utf-8"
    );
    assert.ok(src.includes("redirect") || src.includes("tab=catalog"));
  });
});
