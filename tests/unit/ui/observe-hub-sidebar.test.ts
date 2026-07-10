/**
 * Epic 0005 S4 — Observe unified stream: one hub leaf, hideable retention, redirects.
 * Epic 0005 S6 — hub lives under Observability pillar (not legacy monitoring).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
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

describe("Observe hub — default observability tree", () => {
  const observability = SIDEBAR_SECTIONS.find((s) => s.id === "observability");
  assert.ok(observability, "observability section missing");

  const leafIds = getSectionItems(observability).map((i) => i.id);
  const groupIds = observability.children
    .filter((c): c is { type: "group"; id: string } => "type" in c && c.type === "group")
    .map((g) => g.id);

  it("exposes activity hub among observability leaves (no log/audit peers)", () => {
    assert.ok(leafIds.includes("activity"));
    assert.ok(leafIds.includes("analytics"));
    assert.ok(leafIds.includes("cache"));
    assert.ok(leafIds.includes("provider-stats"));
    assert.ok(leafIds.includes("runtime"));
  });

  it("does not list LOGS_GROUP or AUDIT_GROUP in default tree", () => {
    assert.ok(!groupIds.includes("logs"), "logs group must not be in default tree");
    assert.ok(!groupIds.includes("audit"), "audit group must not be in default tree");
  });

  it("hub leaf points at Observe SSoT path", () => {
    const hub = getSectionItems(observability).find((i) => i.id === "activity");
    assert.ok(hub);
    assert.equal(hub.href, OBSERVE_HUB_PATH);
    assert.equal(hub.icon, "timeline");
  });

  for (const id of OBSERVE_STREAM_SIDEBAR_IDS) {
    it(`does not list collapsed stream leaf "${id}"`, () => {
      assert.ok(!leafIds.includes(id), `${id} must not be a default sidebar leaf`);
    });
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

  it("maps legacy aliases", () => {
    assert.equal(normalizeObserveSource("logs"), "request");
    assert.equal(normalizeObserveSource("request-logs"), "request");
    assert.equal(normalizeObserveSource("proxy-logs"), "proxy");
    assert.equal(normalizeObserveSource("audit-mcp"), "mcp");
    assert.equal(normalizeObserveSource("compliance"), "audit");
  });

  it("builds clean activity URL and source URLs", () => {
    assert.equal(buildObserveHubPath("activity"), "/dashboard/activity");
    assert.equal(buildObserveHubPath("request"), "/dashboard/activity?source=request");
    assert.equal(
      buildObserveHubPath("request", { id: "abc" }),
      "/dashboard/activity?source=request&id=abc"
    );
  });
});

describe("Observe redirect matrix — page sources", () => {
  const pathByFrom: Record<string, string> = {
    "/dashboard/logs": "src/app/(dashboard)/dashboard/logs/page.tsx",
    "/dashboard/logs/proxy": "src/app/(dashboard)/dashboard/logs/proxy/page.tsx",
    "/dashboard/logs/console": "src/app/(dashboard)/dashboard/logs/console/page.tsx",
    "/dashboard/logs/activity": "src/app/(dashboard)/dashboard/logs/activity/page.tsx",
    "/dashboard/audit": "src/app/(dashboard)/dashboard/audit/page.tsx",
    "/dashboard/audit/mcp": "src/app/(dashboard)/dashboard/audit/mcp/page.tsx",
    "/dashboard/audit/a2a": "src/app/(dashboard)/dashboard/audit/a2a/page.tsx",
    "/dashboard/usage": "src/app/(dashboard)/dashboard/usage/page.tsx",
  };

  for (const { from, source } of OBSERVE_REDIRECT_MATRIX) {
    it(`${from} redirects toward hub source=${source}`, () => {
      const rel = pathByFrom[from];
      assert.ok(rel, `missing page map for ${from}`);
      const src = readSrc(rel);
      assert.ok(
        src.includes("redirect") || src.includes("permanentRedirect"),
        `${rel} must call redirect`
      );
      assert.ok(
        src.includes("buildObserveHubPath") || src.includes("/dashboard/activity"),
        `${rel} must target observe hub`
      );
      assert.ok(!src.includes('"use client"'), `${rel} must be a server redirect page`);
      if (source === "activity") {
        assert.ok(
          src.includes('"activity"') || src.includes("('/dashboard/activity')"),
          `${rel} should target activity`
        );
      } else {
        assert.ok(src.includes(`"${source}"`) || src.includes(`'${source}'`), `${rel} source`);
      }
    });
  }

  it("hub page composes ObserveHubClient", () => {
    const src = readSrc("src/app/(dashboard)/dashboard/activity/page.tsx");
    assert.ok(src.includes("ObserveHubClient"));
  });

  it("RequestLogsPanel still wires RequestLoggerV2 + export", () => {
    const src = readSrc("src/app/(dashboard)/dashboard/logs/RequestLogsPanel.tsx");
    assert.ok(src.includes("RequestLoggerV2"));
    assert.ok(src.includes("/api/logs/export"));
  });
});
