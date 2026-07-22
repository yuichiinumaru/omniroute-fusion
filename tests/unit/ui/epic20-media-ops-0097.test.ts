/**
 * Task 0097 / EPIC-20 T20-L — Media under Operations topbar peer `media`.
 * Canonical `/operations/media`; modality L1 strip is content chrome (not a
 * second Ops hub topbar); legacy `/dashboard/cache/media` redirects.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  OPERATIONS_REDIRECT_MATRIX,
  OPERATIONS_TOPBAR_IDS,
  OPERATIONS_TOPBAR_LABELS,
  buildOperationsPath,
} from "../../../src/shared/constants/epic20Operations";
import { getActiveSidebarHref } from "../../../src/shared/utils/sidebarRouteMatch";
import { resolveOperationsTopbarActive } from "../../../src/app/(dashboard)/operations/OperationsTopbar";

const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

const MEDIA_PAGE = "src/app/(dashboard)/operations/media/page.tsx";
const MEDIA_CLIENT = "src/app/(dashboard)/operations/media/MediaPageClient.tsx";
const LEGACY_PAGE = "src/app/(dashboard)/dashboard/cache/media/page.tsx";
const LEGACY_CLIENT = "src/app/(dashboard)/dashboard/cache/media/MediaPageClient.tsx";
const OPS_LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const OPS_TOPBAR = "src/app/(dashboard)/operations/OperationsTopbar.tsx";
const SEGMENT_PAGE = "src/app/(dashboard)/operations/[segment]/page.tsx";
const LABS_PLACEHOLDER = "src/app/(dashboard)/operations/OperationsSegmentPlaceholder.tsx";

const PRIMARY_ITEMS = [
  { id: "home", href: "/home", exact: true },
  { id: "providers", href: "/dashboard/providers" },
  { id: "combos", href: "/dashboard/combos" },
  { id: "activity", href: "/dashboard/activity" },
  { id: "operations", href: "/operations" },
  { id: "settings-general", href: "/dashboard/settings/general" },
  { id: "docs", href: "/docs", external: true },
] as const;

const MODALITIES = ["image", "video", "music", "speech", "transcription"] as const;

const MODALITY_ENDPOINTS = {
  image: "/api/v1/images/generations",
  video: "/api/v1/videos/generations",
  music: "/api/v1/music/generations",
  speech: "/api/v1/audio/speech",
  transcription: "/api/v1/audio/transcriptions",
} as const;

describe("0097 — Media peer path + Ops topbar SSoT", () => {
  it("media is Operations topbar peer #10 with label Media", () => {
    assert.equal(OPERATIONS_TOPBAR_IDS.includes("media"), true);
    assert.equal(OPERATIONS_TOPBAR_IDS[OPERATIONS_TOPBAR_IDS.length - 1], "media");
    assert.equal(OPERATIONS_TOPBAR_LABELS.media, "Media");
    assert.equal(buildOperationsPath("media"), "/operations/media");
  });

  it("resolveOperationsTopbarActive lights media peer on canonical path", () => {
    assert.equal(resolveOperationsTopbarActive(buildOperationsPath("media")), "media");
    assert.equal(resolveOperationsTopbarActive("/operations/media"), "media");
    assert.equal(resolveOperationsTopbarActive("/operations/media/"), "media");
  });

  it("canonical Media route files exist under operations/media", () => {
    assert.equal(exists(MEDIA_PAGE), true, `missing ${MEDIA_PAGE}`);
    assert.equal(exists(MEDIA_CLIENT), true, `missing ${MEDIA_CLIENT}`);
  });

  it("Operations topbar source includes media peer link via builder", () => {
    const topbar = read(OPS_TOPBAR);
    assert.ok(topbar.includes("OPERATIONS_TOPBAR_IDS"));
    assert.ok(topbar.includes("buildOperationsPath"));
    assert.ok(topbar.includes("media"));
    assert.ok(topbar.includes('data-testid="operations-topbar"'));
  });
});

describe("0097 — mount Media under Ops shell (content only)", () => {
  it("operations/media page renders MediaPageClient without re-mounting Ops topbar", () => {
    const page = read(MEDIA_PAGE);
    assert.ok(page.includes("MediaPageClient"));
    assert.equal(
      /import\s+OperationsTopbar\b/.test(page) || /<OperationsTopbar\b/.test(page),
      false,
      "page must not mount OperationsTopbar"
    );
    assert.equal(
      /import\s+PageTabBar\b/.test(page) || /<PageTabBar\b/.test(page),
      false,
      "page must not mount PageTabBar"
    );
    assert.equal(
      /import\s+CostsSubnav\b/.test(page) || /<CostsSubnav\b/.test(page),
      false,
      "page must not mount CostsSubnav"
    );
    assert.equal(page.includes('"use client"'), false, "page shell may be server; client is MediaPageClient");
  });

  it("segment page also mounts Media for id=media (dynamic fallback)", () => {
    const src = read(SEGMENT_PAGE);
    assert.ok(src.includes('id === "media"') || src.includes("id === 'media'"));
    assert.ok(src.includes("MediaPageClient"));
    assert.equal(src.includes("<OperationsTopbar"), false);
  });

  it("Ops layout remains sole OperationsTopbar mount (chrome ≤ 1)", () => {
    const layoutMounts = (read(OPS_LAYOUT).match(/<OperationsTopbar\b/g) ?? []).length;
    assert.equal(layoutMounts, 1, "layout must mount OperationsTopbar exactly once");

    for (const rel of [MEDIA_PAGE, MEDIA_CLIENT, SEGMENT_PAGE]) {
      const mounts = (read(rel).match(/<OperationsTopbar\b/g) ?? []).length;
      assert.equal(mounts, 0, `${rel} must not re-mount OperationsTopbar`);
      const src = read(rel);
      assert.equal(
        /import\s+PageTabBar\b/.test(src) || /<PageTabBar\b/.test(src),
        false,
        `${rel} must not stack PageTabBar hub chrome`
      );
    }
  });
});

describe("0097 — modality L1 strip (Media content chrome)", () => {
  it("MediaPageClient exposes modality strip testid + all 5 modalities", () => {
    const client = read(MEDIA_CLIENT);
    assert.ok(client.includes('data-testid="media-modality-strip"'));
    assert.ok(client.includes('data-testid="media-page"'));
    assert.ok(client.includes('role="tablist"'));
    for (const m of MODALITIES) {
      assert.ok(
        client.includes(`data-testid={\`media-modality-\${key}\`}`) ||
          client.includes(`data-testid="media-modality-${m}"`) ||
          client.includes(`data-modality={key}`) ||
          client.includes(`data-modality="${m}"`),
        `modality affordance for ${m}`
      );
    }
    // MODALITY_CONFIG keys cover the five
    for (const m of MODALITIES) {
      assert.ok(client.includes(`${m}:`), `MODALITY_CONFIG must include ${m}`);
    }
  });

  it("modality strip is not a hub PageTabBar / OperationsTopbar", () => {
    const client = read(MEDIA_CLIENT);
    assert.equal(client.includes("PageTabBar"), false);
    assert.equal(client.includes("OperationsTopbar"), false);
    assert.equal(client.includes("data-operations-topbar"), false);
    assert.ok(client.includes("media-modality-strip"));
  });

  it("generation endpoints wiring preserved in MODALITY_CONFIG", () => {
    const client = read(MEDIA_CLIENT);
    for (const [modality, endpoint] of Object.entries(MODALITY_ENDPOINTS)) {
      assert.ok(
        client.includes(`"${endpoint}"`) || client.includes(`'${endpoint}'`),
        `${modality} must keep endpoint ${endpoint}`
      );
    }
    // Registries still imported
    assert.ok(client.includes("imageRegistry"));
    assert.ok(client.includes("videoRegistry"));
    assert.ok(client.includes("musicRegistry"));
    assert.ok(client.includes("audioRegistry"));
  });
});

describe("0097 — legacy redirect /dashboard/cache/media", () => {
  it("0086 matrix row ownerTask 0097 maps cache/media → buildOperationsPath(media)", () => {
    const row = OPERATIONS_REDIRECT_MATRIX.find((e) => e.from === "/dashboard/cache/media");
    assert.ok(row, "matrix must include /dashboard/cache/media");
    assert.equal(row!.to, buildOperationsPath("media"));
    assert.equal(row!.to, "/operations/media");
    assert.equal(row!.hub, "operations");
    assert.equal(row!.ownerTask, "0097");
  });

  it("legacy page is server redirect shell using epic20Operations builder", () => {
    const src = read(LEGACY_PAGE);
    assert.equal(src.includes('"use client"'), false, "must be server redirect");
    assert.ok(src.includes("redirect"), "must call redirect()");
    assert.ok(
      src.includes("from \"next/navigation\"") || src.includes("from 'next/navigation'"),
      "must import redirect from next/navigation"
    );
    assert.ok(src.includes("epic20Operations"), "must use epic20Operations builders");
    assert.ok(
      src.includes("buildOperationsPath") || src.includes(buildOperationsPath("media")),
      "must redirect via media builder"
    );
    assert.equal(
      src.includes("MediaPageClient"),
      false,
      "legacy page must not still render Media UI (redirect only)"
    );
    assert.equal(src.includes("OperationsTopbar"), false);
    assert.equal(src.includes("PageTabBar"), false);
  });

  it("legacy MediaPageClient re-exports canonical client (archive-not-delete)", () => {
    assert.equal(exists(LEGACY_CLIENT), true);
    const src = read(LEGACY_CLIENT);
    assert.ok(
      src.includes("operations/media/MediaPageClient") || src.includes("../media/MediaPageClient"),
      "legacy client must re-export canonical path"
    );
  });
});

describe("0097 — anti-phantom / no-new-leaf / not Labs collapsible", () => {
  it("does not add primary sidebar leaf media", () => {
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("media"), false);
    assert.equal(
      PRIMARY_SIDEBAR_ITEMS.some((i) => i.id === "media"),
      false
    );
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
    const ops = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "operations");
    assert.ok(ops);
    assert.equal(ops.href, "/operations");
  });

  it("sidebar Operations lights on /operations/media", () => {
    assert.equal(
      getActiveSidebarHref(buildOperationsPath("media"), [...PRIMARY_ITEMS]),
      "/operations"
    );
    assert.equal(getActiveSidebarHref("/operations/media", [...PRIMARY_ITEMS]), "/operations");
  });

  it("Media is not a Labs collapsible block in Ops placeholder / media client", () => {
    const placeholder = read(LABS_PLACEHOLDER);
    // Placeholder is per-peer stubs — media must not be nested under labs collapsible UI
    assert.equal(placeholder.includes("collapsible"), false);
    const client = read(MEDIA_CLIENT);
    assert.equal(client.includes("labs-collapsible"), false);
    assert.equal(client.includes("data-labs-collapsible"), false);
    // Media page must not claim to be Labs content
    assert.equal(client.includes("data-operations-placeholder"), false);
  });

  it("Header title matcher covers canonical /operations/media", () => {
    const header = read("src/shared/components/Header.tsx");
    assert.ok(
      header.includes('matchOpsPeerPath("media")') ||
        header.includes("/operations/media") ||
        header.includes('"media"')
    );
    // Keep legacy match until redirects fully drain bookmarks
    assert.ok(header.includes("/dashboard/cache/media"));
  });
});
