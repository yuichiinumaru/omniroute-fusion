import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  COMPRESSION_CONTEXT_GROUP,
  COMPRESSION_ENGINE_SIDEBAR_IDS,
  ANALYTICS_DUAL_NAV_SIDEBAR_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
  SIDEBAR_SECTIONS,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";

/**
 * Compression engines + analytics dual-nav stay off the flat primary chrome.
 */

function defaultLeafIds(): string[] {
  return SIDEBAR_SECTIONS.filter((s) => s.visibility !== "debug").flatMap((section) =>
    getSectionItems(section).map((i) => i.id)
  );
}

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

describe("flat primary chrome keeps engines and dual-nav off", () => {
  const leafIds = defaultLeafIds();

  it("analytics is not a primary hub (EPIC-19 / 0082) but hideable id retained", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("analytics"), false);
    assert.equal(leafIds.includes("analytics"), false);
    assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("analytics"));
  });

  for (const id of ANALYTICS_DUAL_NAV_SIDEBAR_IDS) {
    it(`does not list dual-nav leaf "${id}"`, () => {
      assert.ok(!leafIds.includes(id), `${id} must not be a sidebar leaf`);
    });
    it(`still hideable for prefs: "${id}"`, () => {
      assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes(id));
    });
  }

  for (const id of COMPRESSION_ENGINE_SIDEBAR_IDS) {
    it(`engine "${id}" is not a primary leaf`, () => {
      assert.ok(!leafIds.includes(id));
    });
  }
});
