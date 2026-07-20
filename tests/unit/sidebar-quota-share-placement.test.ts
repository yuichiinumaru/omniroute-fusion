/**
 * Quota Share placement under flat costs hub inventory (Task 0025 F4 cleanup).
 * Pre-flat GOVERNANCE_ITEMS array is gone — assert hideable + COSTS_HUB_DEEP_LINK_IDS order.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  COSTS_HUB_DEEP_LINK_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
} from "../../src/shared/constants/sidebarVisibility";

test("quota and costs-quota-share remain hideable prefs ids", () => {
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("quota"));
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("costs-quota-share"));
});

test("costs-quota-share appears after quota in COSTS_HUB_DEEP_LINK_IDS", () => {
  const ids = COSTS_HUB_DEEP_LINK_IDS as readonly string[];
  const idxQuota = ids.indexOf("quota");
  const idxShare = ids.indexOf("costs-quota-share");
  assert.ok(idxQuota >= 0, "quota in COSTS_HUB_DEEP_LINK_IDS");
  assert.ok(idxShare >= 0, "costs-quota-share in COSTS_HUB_DEEP_LINK_IDS");
  assert.ok(idxShare > idxQuota, "costs-quota-share must follow quota");
});

test("costs-quota-share is not a primary leaf (costs hub also dropped in 0082)", () => {
  assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("costs-quota-share"), false);
  assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("costs"), false);
  assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("costs"));
});

test("exactly one costs-quota-share entry in hub deep-link inventory", () => {
  const occurrences = (COSTS_HUB_DEEP_LINK_IDS as readonly string[]).filter(
    (id) => id === "costs-quota-share"
  ).length;
  assert.equal(occurrences, 1);
});
