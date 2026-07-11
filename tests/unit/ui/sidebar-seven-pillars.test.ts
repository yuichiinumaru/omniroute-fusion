/**
 * Conceptual 7 pillars remain as IA mapping; default chrome is flat primary nav.
 * Full accordion pillar sections were removed (site-of-government anti-pattern).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  OPERATIONAL_PILLAR_SECTION_IDS,
  PRIMARY_SIDEBAR_ITEMS,
  SIDEBAR_SECTIONS,
  countPresetVisibleLeaves,
} from "../../../src/shared/constants/sidebarVisibility";

describe("operational pillars (conceptual IA, not accordion sections)", () => {
  it("still defines 7 operational pillar ids for hub mapping", () => {
    assert.equal(OPERATIONAL_PILLAR_SECTION_IDS.length, 7);
  });

  it("default sidebar chrome is flat main + debug, not 7 accordion sections", () => {
    assert.deepEqual(
      SIDEBAR_SECTIONS.map((s) => s.id),
      ["main", "devtools"]
    );
  });

  it("primary flat leaves ≤ 10", () => {
    assert.ok(PRIMARY_SIDEBAR_ITEMS.length <= 10);
    assert.equal(countPresetVisibleLeaves("all"), PRIMARY_SIDEBAR_ITEMS.length);
  });
});
