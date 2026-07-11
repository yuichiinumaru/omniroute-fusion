/**
 * Epic 0005 S4 — Observe unified stream: one hub leaf, hideable retention, redirects.
 * Flat primary nav: activity is a primary leaf; log/audit multi-leaves stay out of chrome.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
  SIDEBAR_SECTIONS,
  getSectionItems,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OBSERVE_STREAM_SIDEBAR_IDS,
  OBSERVE_REDIRECT_MATRIX,
  OBSERVE_HUB_PATH,
  buildObserveHubPath,
  normalizeObserveSource,
} from "../../../src/shared/constants/observeHub";

const root = resolve(import.meta.dirname ?? new URL(".", import.meta.url).pathname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(resolve(root, rel), "utf-8");
}

function defaultLeafIds(): string[] {
  return SIDEBAR_SECTIONS.filter((s) => s.visibility !== "debug").flatMap((section) =>
    getSectionItems(section).map((i) => i.id)
  );
}

describe("Observe hub — default flat tree", () => {
  const leafIds = defaultLeafIds();

  it("exposes activity as primary Observe hub", () => {
    assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("activity"));
    assert.ok(leafIds.includes("activity"));
  });

  it("does not list collapsed stream leaves (logs/audit) as primary", () => {
    for (const id of OBSERVE_STREAM_SIDEBAR_IDS) {
      assert.ok(!leafIds.includes(id), `${id} must not be a default sidebar leaf`);
    }
  });

  it("hub leaf points at Observe SSoT path", () => {
    const main = SIDEBAR_SECTIONS.find((s) => s.id === "main");
    assert.ok(main);
    const hub = getSectionItems(main!).find((i) => i.id === "activity");
    assert.ok(hub);
    assert.equal(hub.href, OBSERVE_HUB_PATH);
    assert.equal(hub.icon, "timeline");
  });

  for (const id of OBSERVE_STREAM_SIDEBAR_IDS) {
    it(`still hideable for prefs: "${id}"`, () => {
      assert.ok(
        (HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes(id),
        `Expected HIDEABLE_SIDEBAR_ITEM_IDS to include "${id}"`
      );
    });
  }

  it("activity hub remains hideable", () => {
    assert.ok((HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[]).includes("activity"));
  });
});

describe("normalizeObserveSource + buildObserveHubPath", () => {
  it("defaults to activity", () => {
    assert.equal(normalizeObserveSource(null), "activity");
    assert.equal(normalizeObserveSource(""), "activity");
    assert.equal(normalizeObserveSource("unknown"), "activity");
  });

  it("accepts known sources", () => {
    assert.equal(normalizeObserveSource("request"), "request");
    assert.equal(normalizeObserveSource("proxy"), "proxy");
    assert.equal(normalizeObserveSource("audit"), "audit");
  });

  it("buildObserveHubPath omits default source", () => {
    assert.equal(buildObserveHubPath("activity"), OBSERVE_HUB_PATH);
    assert.ok(buildObserveHubPath("request").includes("source=request"));
  });
});

describe("Observe redirect matrix sources", () => {
  it("covers legacy log and audit paths", () => {
    const paths = OBSERVE_REDIRECT_MATRIX.map((r) => r.from);
    assert.ok(paths.some((p) => p.includes("/logs")));
    assert.ok(paths.some((p) => p.includes("/audit")));
  });
});

// Keep a light source smoke if route files still exist
describe("Observe route files still present", () => {
  it("activity page exists", () => {
    const src = readSrc("src/app/(dashboard)/dashboard/activity/page.tsx");
    assert.ok(src.length > 0);
  });
});
