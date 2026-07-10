import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  COMPRESSION_CONTEXT_GROUP,
  COMPRESSION_ENGINE_SIDEBAR_IDS,
  ANALYTICS_DUAL_NAV_SIDEBAR_IDS,
  SIDEBAR_SECTIONS,
} from "../../../src/shared/constants/sidebarVisibility";

/**
 * Epic 0005 S3 — compression engines are routes + hideable prefs, not sidebar leaves.
 * Epic 0005 S2 — analytics dual-nav leaves removed from default tree.
 */

describe("HIDEABLE_SIDEBAR_ITEM_IDS retains engine ids for prefs", () => {
  for (const id of COMPRESSION_ENGINE_SIDEBAR_IDS) {
    it(`includes "${id}"`, () => {
      assert.ok(
        (HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes(id),
        `Expected HIDEABLE_SIDEBAR_ITEM_IDS to include "${id}"`
      );
    });
  }
});

describe("COMPRESSION_CONTEXT_GROUP is hub-only (no engine leaves)", () => {
  const itemIds = COMPRESSION_CONTEXT_GROUP.items.map((item) => item.id);

  it("contains settings, combos, studio only", () => {
    assert.deepEqual(itemIds, ["context-settings", "context-combos", "compression-studio"]);
  });

  for (const id of COMPRESSION_ENGINE_SIDEBAR_IDS) {
    it(`does not list engine leaf "${id}"`, () => {
      assert.ok(!itemIds.includes(id), `${id} must not be a sidebar leaf`);
    });
  }
});

describe("ANALYTICS section has no dual-nav leaves", () => {
  const analyticsSection = SIDEBAR_SECTIONS.find((s) => s.id === "analytics");
  assert.ok(analyticsSection, "analytics section missing");

  const leafIds = analyticsSection.children
    .filter((c) => !("type" in c && c.type === "group"))
    .map((c) => (c as { id: string }).id);

  it("hub leaves are analytics + cache + provider-stats", () => {
    assert.deepEqual(leafIds, ["analytics", "cache", "provider-stats"]);
  });

  for (const id of ANALYTICS_DUAL_NAV_SIDEBAR_IDS) {
    it(`does not list dual-nav leaf "${id}"`, () => {
      assert.ok(!leafIds.includes(id), `${id} must not be a sidebar leaf`);
    });
    it(`still hideable for prefs: "${id}"`, () => {
      assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes(id));
    });
  }
});
