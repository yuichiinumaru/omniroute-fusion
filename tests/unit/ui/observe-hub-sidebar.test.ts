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
    assert.ok(paths.includes("/dashboard/usage"));
  });

  /** Map hub matrix `from` → App Router page under `src/app/(dashboard)`. */
  const PAGE_BY_FROM: Record<string, string> = {
    "/dashboard/logs": "src/app/(dashboard)/dashboard/logs/page.tsx",
    "/dashboard/logs/proxy": "src/app/(dashboard)/dashboard/logs/proxy/page.tsx",
    "/dashboard/logs/console": "src/app/(dashboard)/dashboard/logs/console/page.tsx",
    "/dashboard/logs/activity": "src/app/(dashboard)/dashboard/logs/activity/page.tsx",
    "/dashboard/audit": "src/app/(dashboard)/dashboard/audit/page.tsx",
    "/dashboard/audit/mcp": "src/app/(dashboard)/dashboard/audit/mcp/page.tsx",
    "/dashboard/audit/a2a": "src/app/(dashboard)/dashboard/audit/a2a/page.tsx",
    "/dashboard/usage": "src/app/(dashboard)/dashboard/usage/page.tsx",
  };

  for (const entry of OBSERVE_REDIRECT_MATRIX) {
    it(`server-redirects ${entry.from} → source=${entry.source}`, () => {
      const rel = PAGE_BY_FROM[entry.from];
      assert.ok(rel, `missing page mapping for ${entry.from}`);
      const src = readSrc(rel);
      assert.ok(
        src.includes("redirect") || src.includes("permanentRedirect"),
        `${rel} must call redirect/permanentRedirect`
      );
      assert.ok(
        src.includes("buildObserveHubPath") || src.includes(OBSERVE_HUB_PATH),
        `${rel} must target Observe hub`
      );
      // Source argument should appear when not default activity-only clean URL.
      if (entry.source !== "activity") {
        assert.ok(
          src.includes(`"${entry.source}"`) || src.includes(`'${entry.source}'`),
          `${rel} must pass source "${entry.source}"`
        );
      }
      assert.ok(!src.includes('"use client"'), `${rel} must remain a server redirect`);
    });
  }
});

describe("Legacy usage deep-links (Task 0023 path-to-100)", () => {
  it("ProviderQuotaWidget links to /dashboard/quota (not usage?tab=limits)", () => {
    const src = readSrc("src/app/(dashboard)/home/ProviderQuotaWidget.tsx");
    assert.ok(
      src.includes('href="/dashboard/quota"') || src.includes("href={'/dashboard/quota'}"),
      "View details must target Provider Limits home"
    );
    assert.ok(
      !src.includes("/dashboard/usage?tab=limits"),
      "must not deep-link to legacy usage?tab=limits (S4 redirects lose tab intent)"
    );
  });

  it("usage page branches tab=limits → quota before observe request redirect", () => {
    const src = readSrc("src/app/(dashboard)/dashboard/usage/page.tsx");
    assert.ok(src.includes("limits"), "must inspect tab=limits");
    assert.ok(src.includes("/dashboard/quota"), "tab=limits must re-home to /dashboard/quota");
    assert.ok(
      src.includes("buildObserveHubPath") || src.includes(OBSERVE_HUB_PATH),
      "default path still targets Observe hub"
    );
  });
});

describe("Observe hub shell composition", () => {
  it("activity page mounts ObserveHubClient", () => {
    const src = readSrc("src/app/(dashboard)/dashboard/activity/page.tsx");
    assert.ok(src.includes("ObserveHubClient"));
  });

  it("hub composes domain viewers (no god-logger)", () => {
    const src = readSrc("src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx");
    for (const needle of [
      "ActivityFeedClient",
      "RequestLogsPanel",
      "ProxyLogger",
      "ConsoleLogViewer",
      "ComplianceTab",
      "McpAuditTab",
      "A2aAuditTab",
      "normalizeObserveSource",
      "ObserveHubSubnav",
    ]) {
      assert.ok(src.includes(needle), `hub must compose ${needle}`);
    }
    assert.ok(!src.includes("god"), "sanity");
  });

  it("exposes Health as a discoverable link, not a stream tab (Task 0061)", () => {
    const subnav = readSrc("src/shared/components/ObserveHubSubnav.tsx");
    assert.ok(subnav.includes("data-observe-health-link"));
    assert.ok(subnav.includes("HEALTH_NAV_ITEM"));
    const src = readSrc("src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx");
    assert.ok(!src.includes('id: "health"'));
  });
});
