/**
 * Task 0100 / EPIC-20 T20-O — final Ops chrome gate.
 *
 * Binary checks (Hard Rules #22–#23):
 *   A. Chrome mount ≤ 1 Operations hub topbar on every landed `/operations/*` peer
 *   B. OPERATIONS_REDIRECT_MATRIX rows for landed peers (0096–0099 required)
 *   C. Sidebar Operations active on `/operations/*`; Traffic → Observe
 *   D. No new primary leaves; Testing hub redirect-only
 *   E. Header peer titles not shadowed by catch-all / sidebar prefix
 *
 * Consumes 0086 SSoT (`epic20Operations`) — no forked path strings.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS,
  EPIC20_TRAFFIC_INSPECTOR_PATH,
  OPERATIONS_DEFAULT_TOPBAR_ID,
  OPERATIONS_HUB_PATH,
  OPERATIONS_REDIRECT_MATRIX,
  OPERATIONS_TOPBAR_IDS,
  OPERATIONS_TOPBAR_LABELS,
  buildObserveTrafficInspectorPath,
  buildOperationsHubPath,
  buildOperationsPath,
  type OperationsTopbarId,
} from "../../../src/shared/constants/epic20Operations";
import {
  getActiveSidebarHref,
  resolveSidebarHubAlias,
} from "../../../src/shared/utils/sidebarRouteMatch";
import { resolveOperationsTopbarActive } from "../../../src/app/(dashboard)/operations/OperationsTopbar";
import { resolveDeepHeaderTitleFallback } from "../../../src/shared/components/Header";
import {
  TESTING_HUB_CANONICAL_PATH,
} from "../../../src/shared/constants/testingHub";

const ROOT = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function exists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

/** Walk operations tree for source files (tsx/ts). */
function listOpsSources(): string[] {
  const base = join(ROOT, "src/app/(dashboard)/operations");
  const out: string[] = [];
  function walk(dir: string) {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(tsx|ts)$/.test(name)) {
        out.push(full.slice(ROOT.length + 1).replace(/\\/g, "/"));
      }
    }
  }
  walk(base);
  return out;
}

const OPS_LAYOUT = "src/app/(dashboard)/operations/layout.tsx";
const OPS_TOPBAR = "src/app/(dashboard)/operations/OperationsTopbar.tsx";
const LABS_CLIENT = "src/app/(dashboard)/operations/labs/LabsPageClient.tsx";
const MEDIA_CLIENT = "src/app/(dashboard)/operations/media/MediaPageClient.tsx";
const TESTING_PAGE = "src/app/(dashboard)/dashboard/testing/page.tsx";
const TRAFFIC_LEGACY = "src/app/(dashboard)/dashboard/tools/traffic-inspector/page.tsx";
const OBSERVE_SUBNAV = "src/shared/components/ObserveHubSubnav.tsx";
const OBSERVE_HUB = "src/app/(dashboard)/dashboard/activity/ObserveHubClient.tsx";

/** Peer id → expected content page/client relative path when landed. */
const LANDED_PEER_FILES: Readonly<
  Record<OperationsTopbarId, readonly string[]>
> = {
  endpoints: [
    "src/app/(dashboard)/operations/endpoints/page.tsx",
    "src/app/(dashboard)/operations/endpoints/EndpointsFusionClient.tsx",
  ],
  "core-mcp": [
    "src/app/(dashboard)/operations/core-mcp/page.tsx",
    "src/app/(dashboard)/operations/core-mcp/CoreMcpPageClient.tsx",
  ],
  agents: [
    "src/app/(dashboard)/operations/agents/page.tsx",
    "src/app/(dashboard)/operations/agents/AgentsFusionClient.tsx",
  ],
  "cloud-agents": [
    "src/app/(dashboard)/operations/cloud-agents/page.tsx",
    "src/app/(dashboard)/operations/cloud-agents/CloudAgentsPageClient.tsx",
  ],
  "a2a-acp-bridge": [
    "src/app/(dashboard)/operations/a2a-acp-bridge/A2aAcpBridgePage.tsx",
    "src/app/(dashboard)/operations/a2a-acp-bridge/A2aAcpBridgeStackClient.tsx",
  ],
  skills: [
    "src/app/(dashboard)/operations/skills/page.tsx",
    "src/app/(dashboard)/operations/skills/SkillsStackPageClient.tsx",
  ],
  integrations: [
    "src/app/(dashboard)/operations/integrations/page.tsx",
    "src/app/(dashboard)/operations/integrations/IntegrationsPageClient.tsx",
  ],
  memory: ["src/app/(dashboard)/operations/memory/page.tsx"],
  labs: [
    "src/app/(dashboard)/operations/labs/page.tsx",
    "src/app/(dashboard)/operations/labs/LabsPageClient.tsx",
  ],
  media: [
    "src/app/(dashboard)/operations/media/page.tsx",
    "src/app/(dashboard)/operations/media/MediaPageClient.tsx",
  ],
};

const PRIMARY_ITEMS = [
  { id: "home", href: "/home", exact: true },
  { id: "providers", href: "/dashboard/providers" },
  { id: "combos", href: "/dashboard/combos" },
  { id: "activity", href: "/dashboard/activity" },
  { id: "operations", href: "/operations" },
  { id: "settings-general", href: "/dashboard/settings/general" },
  { id: "docs", href: "/docs", external: true },
] as const;

/** Legacy path → expected redirect page under dashboard (for product wiring). */
const REQUIRED_REDIRECT_PAGES: ReadonlyArray<{ from: string; page: string }> = [
  { from: "/dashboard/playground", page: "src/app/(dashboard)/dashboard/playground/page.tsx" },
  { from: "/dashboard/translator", page: "src/app/(dashboard)/dashboard/translator/page.tsx" },
  { from: "/dashboard/search-tools", page: "src/app/(dashboard)/dashboard/search-tools/page.tsx" },
  { from: "/dashboard/batch", page: "src/app/(dashboard)/dashboard/batch/page.tsx" },
  { from: "/dashboard/batch/files", page: "src/app/(dashboard)/dashboard/batch/files/page.tsx" },
  { from: "/dashboard/cache/media", page: "src/app/(dashboard)/dashboard/cache/media/page.tsx" },
  { from: "/dashboard/testing", page: TESTING_PAGE },
  {
    from: "/dashboard/tools/traffic-inspector",
    page: TRAFFIC_LEGACY,
  },
];

// ---------------------------------------------------------------------------
// A. Chrome mount ≤ 1
// ---------------------------------------------------------------------------

describe("0100 A — Ops hub topbar mount ≤ 1 (anti-phantom)", () => {
  it("layout is the sole <OperationsTopbar /> mount under operations/", () => {
    assert.equal(exists(OPS_LAYOUT), true);
    const layout = read(OPS_LAYOUT);
    const layoutMounts = (layout.match(/<OperationsTopbar\b/g) ?? []).length;
    assert.equal(layoutMounts, 1, "layout must mount OperationsTopbar exactly once");
    assert.ok(layout.includes("data-operations-shell"), "shell marker");
    assert.equal(layout.includes("PageTabBar"), false);
    assert.equal(layout.includes("CostsSubnav"), false);
    assert.equal(layout.includes("ObserveHubSubnav"), false);
  });

  it("OperationsTopbar exposes SSoT test hooks (data-operations-topbar)", () => {
    const src = read(OPS_TOPBAR);
    assert.ok(src.includes("data-operations-topbar"));
    assert.ok(src.includes('data-testid="operations-topbar"'));
    assert.ok(src.includes("OPERATIONS_TOPBAR_IDS"));
    assert.ok(src.includes("buildOperationsPath"));
    assert.equal(OPERATIONS_TOPBAR_IDS.length, 10);
  });

  it("no peer content file re-mounts OperationsTopbar / PageTabBar / CostsSubnav", () => {
    const sources = listOpsSources().filter(
      (rel) => !rel.endsWith("layout.tsx") && !rel.endsWith("OperationsTopbar.tsx")
    );
    for (const rel of sources) {
      const src = read(rel);
      assert.equal(
        (src.match(/<OperationsTopbar\b/g) ?? []).length,
        0,
        `${rel} must not re-mount OperationsTopbar`
      );
      assert.equal(
        /import\s+OperationsTopbar\b/.test(src) || /from\s+["'].*OperationsTopbar/.test(src),
        false,
        `${rel} must not import OperationsTopbar`
      );
      assert.equal(
        /import\s+PageTabBar\b/.test(src) || /<PageTabBar\b/.test(src),
        false,
        `${rel} must not stack PageTabBar hub chrome`
      );
      assert.equal(
        /import\s+CostsSubnav\b/.test(src) || /<CostsSubnav\b/.test(src),
        false,
        `${rel} must not stack CostsSubnav`
      );
    }
  });

  it("every topbar peer has landed content (no residual placeholders required)", () => {
    const residuals: string[] = [];
    for (const id of OPERATIONS_TOPBAR_IDS) {
      const files = LANDED_PEER_FILES[id];
      const missing = files.filter((f) => !exists(f));
      if (missing.length === files.length) {
        residuals.push(id);
      } else {
        assert.equal(
          missing.length,
          0,
          `peer ${id} partially missing: ${missing.join(", ")}`
        );
      }
    }
    assert.deepEqual(
      residuals,
      [],
      `residual peers (no content): ${residuals.join(", ") || "(none)"}`
    );
  });

  it("Labs: no simultaneous hub L1 SearchToolsTopBar / StudioTopBar strips", () => {
    assert.equal(exists(LABS_CLIENT), true);
    const labs = read(LABS_CLIENT);
    assert.equal(
      labs.includes('data-testid="search-tools-topbar"'),
      false,
      "Labs must not declare search-tools-topbar as L1 hub strip"
    );
    assert.equal(
      /import\s+StudioTopBar\b/.test(labs) || /<StudioTopBar\b/.test(labs),
      false,
      "Labs must not mount StudioTopBar as hub L1"
    );
    assert.equal(
      /import\s+SearchToolsTopBar\b/.test(labs) || /<SearchToolsTopBar\b/.test(labs),
      false,
      "Labs must not mount SearchToolsTopBar as hub L1"
    );
    // Inline mode chrome is allowed (content, not hub strip)
    assert.ok(
      labs.includes("modeChrome") || labs.includes("inline") || labs.includes("PlaygroundStudio"),
      "Labs composes playground with in-block mode chrome"
    );
  });

  it("Media: Ops hub topbar only in layout; modality strip is content chrome", () => {
    assert.equal(exists(MEDIA_CLIENT), true);
    const media = read(MEDIA_CLIENT);
    assert.equal((media.match(/<OperationsTopbar\b/g) ?? []).length, 0);
    assert.equal(media.includes("data-operations-topbar"), false);
    // Modality strip allowed as content — must not claim hub topbar role
    assert.equal(media.includes('data-testid="operations-topbar"'), false);
  });

  it("resolveOperationsTopbarActive maps all 10 peers + hub root default", () => {
    assert.equal(resolveOperationsTopbarActive(OPERATIONS_HUB_PATH), OPERATIONS_DEFAULT_TOPBAR_ID);
    for (const id of OPERATIONS_TOPBAR_IDS) {
      assert.equal(resolveOperationsTopbarActive(buildOperationsPath(id)), id);
    }
  });
});

// ---------------------------------------------------------------------------
// B. Redirect matrix
// ---------------------------------------------------------------------------

describe("0100 B — OPERATIONS_REDIRECT_MATRIX (SSoT + product wiring)", () => {
  it("every matrix `to` is produced by builders (no 404 ad-hoc strings)", () => {
    const allowedTo = new Set<string>([
      buildOperationsHubPath(),
      ...OPERATIONS_TOPBAR_IDS.map((id) => buildOperationsPath(id)),
      buildObserveTrafficInspectorPath(),
    ]);
    for (const row of OPERATIONS_REDIRECT_MATRIX) {
      assert.ok(
        allowedTo.has(row.to),
        `matrix to=${row.to} from=${row.from} not produced by builders`
      );
    }
  });

  it("required 0096 Labs rows: playground/translator/search-tools/batch/files", () => {
    const labs = buildOperationsPath("labs");
    for (const from of [
      "/dashboard/playground",
      "/dashboard/translator",
      "/dashboard/search-tools",
      "/dashboard/batch",
      "/dashboard/batch/files",
    ] as const) {
      const row = OPERATIONS_REDIRECT_MATRIX.find((r) => r.from === from);
      assert.ok(row, `missing matrix row ${from}`);
      assert.equal(row!.to, labs);
      assert.equal(row!.hub, "operations");
      assert.equal(row!.ownerTask, "0096");
    }
  });

  it("required 0097 Media row: cache/media → media", () => {
    const row = OPERATIONS_REDIRECT_MATRIX.find((r) => r.from === "/dashboard/cache/media");
    assert.ok(row);
    assert.equal(row!.to, buildOperationsPath("media"));
    assert.equal(row!.ownerTask, "0097");
    assert.equal(row!.hub, "operations");
  });

  it("required 0098 Traffic → Observe frozen path", () => {
    const row = OPERATIONS_REDIRECT_MATRIX.find(
      (r) => r.from === "/dashboard/tools/traffic-inspector"
    );
    assert.ok(row);
    assert.equal(row!.to, EPIC20_TRAFFIC_INSPECTOR_PATH);
    assert.equal(row!.to, buildObserveTrafficInspectorPath());
    assert.equal(row!.hub, "observe");
    assert.equal(row!.ownerTask, "0098");
    assert.ok(!row!.to.startsWith("/operations"));
  });

  it("required 0099 Testing → Labs", () => {
    const row = OPERATIONS_REDIRECT_MATRIX.find((r) => r.from === "/dashboard/testing");
    assert.ok(row);
    assert.equal(row!.to, buildOperationsPath("labs"));
    assert.equal(row!.to, TESTING_HUB_CANONICAL_PATH);
    assert.equal(row!.ownerTask, "0099");
    assert.notEqual(row!.to, buildOperationsPath("media"));
  });

  it("legacy redirect pages for 0096–0099 use builders (not dual-serve)", () => {
    for (const { from, page } of REQUIRED_REDIRECT_PAGES) {
      assert.equal(exists(page), true, `missing redirect page for ${from}: ${page}`);
      const src = read(page);
      assert.ok(src.includes("redirect("), `${page} must call redirect()`);
      assert.ok(
        src.includes("buildOperationsPath") ||
          src.includes("buildObserveTrafficInspectorPath") ||
          src.includes("TESTING_HUB_CANONICAL_PATH") ||
          src.includes("EPIC20_TRAFFIC_INSPECTOR_PATH") ||
          src.includes("buildObserveTrafficPanelPath") ||
          src.includes("buildObserveOperationalPanelPath"),
        `${page} must use 0086/epic builder or frozen SSoT path constant`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// C. Sidebar Operations active
// ---------------------------------------------------------------------------

describe("0100 C — Sidebar Operations active on /operations/*", () => {
  it("PRIMARY leaf is /operations; count 7", () => {
    const ops = PRIMARY_SIDEBAR_ITEMS.find((i) => i.id === "operations");
    assert.ok(ops);
    assert.equal(ops!.href, OPERATIONS_HUB_PATH);
    assert.equal(PRIMARY_SIDEBAR_ITEMS.length, 7);
  });

  it("getActiveSidebarHref lights Operations for hub + all 10 peers", () => {
    assert.equal(getActiveSidebarHref("/operations", [...PRIMARY_ITEMS]), "/operations");
    for (const id of OPERATIONS_TOPBAR_IDS) {
      const path = buildOperationsPath(id);
      assert.equal(
        getActiveSidebarHref(path, [...PRIMARY_ITEMS]),
        "/operations",
        `Operations active for ${path}`
      );
    }
  });

  it("does not light Providers/Home/Observe/Routing on Ops peers", () => {
    for (const path of [
      "/operations",
      "/operations/labs",
      "/operations/media",
      "/operations/endpoints",
      "/operations/integrations",
    ]) {
      const active = getActiveSidebarHref(path, [...PRIMARY_ITEMS]);
      assert.equal(active, "/operations");
      assert.notEqual(active, "/home");
      assert.notEqual(active, "/dashboard/providers");
      assert.notEqual(active, "/dashboard/activity");
      assert.notEqual(active, "/dashboard/combos");
    }
  });

  it("Traffic frozen path lights Observe (activity), not Operations", () => {
    const trafficPath = "/dashboard/activity"; // usePathname strips query
    assert.equal(getActiveSidebarHref(trafficPath, [...PRIMARY_ITEMS]), "/dashboard/activity");
    assert.notEqual(
      getActiveSidebarHref(trafficPath, [...PRIMARY_ITEMS]),
      "/operations"
    );
    // Legacy traffic-inspector alias → Observe
    assert.deepEqual(resolveSidebarHubAlias("/dashboard/tools/traffic-inspector"), {
      primaryLeafId: "activity",
      primaryHref: "/dashboard/activity",
    });
    assert.equal(
      getActiveSidebarHref("/dashboard/tools/traffic-inspector", [...PRIMARY_ITEMS]),
      "/dashboard/activity"
    );
  });

  it("legacy /dashboard/operations aliases to Operations", () => {
    assert.deepEqual(resolveSidebarHubAlias("/dashboard/operations"), {
      primaryLeafId: "operations",
      primaryHref: "/operations",
    });
  });
});

// ---------------------------------------------------------------------------
// D. No new leaves + Testing retire
// ---------------------------------------------------------------------------

describe("0100 D — No new primary leaves + Testing retire", () => {
  it("PRIMARY_SIDEBAR_ITEM_IDS excludes EPIC-20 forbidden leaves", () => {
    const forbidden = [
      "playground",
      "translator",
      "search-tools",
      "testing",
      "media",
      "traffic-inspector",
      "labs",
      "mcp",
      "endpoints",
      "skills",
      "agents",
      "memory",
      "integrations",
      "cloud-agents",
    ] as const;
    for (const id of forbidden) {
      assert.equal(
        (PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes(id),
        false,
        `${id} must not be a primary leaf`
      );
    }
    for (const id of EPIC20_FORBIDDEN_PRIMARY_LEAF_IDS) {
      assert.equal(
        (PRIMARY_SIDEBAR_ITEM_IDS as readonly string[]).includes(id),
        false,
        `EPIC20_FORBIDDEN ${id}`
      );
    }
  });

  it("Testing hub is redirect-only (0099)", () => {
    const page = read(TESTING_PAGE);
    assert.ok(page.includes("redirect("));
    assert.equal(page.includes('"use client"'), false);
    assert.equal(page.includes("TestingHubClient"), false);
    assert.equal(TESTING_HUB_CANONICAL_PATH, buildOperationsPath("labs"));
  });

  it("Traffic is not an Operations topbar peer", () => {
    assert.ok(!(OPERATIONS_TOPBAR_IDS as readonly string[]).includes("traffic"));
    assert.ok(!(OPERATIONS_TOPBAR_IDS as readonly string[]).includes("traffic-inspector"));
  });
});

// ---------------------------------------------------------------------------
// E. Traffic on Observe chrome + Header peer titles
// ---------------------------------------------------------------------------

describe("0100 E — Traffic Observe chrome + Header peer titles", () => {
  it("Observe subnav includes traffic peer; no Ops topbar on Observe hub", () => {
    const subnav = read(OBSERVE_SUBNAV);
    assert.ok(subnav.includes("traffic") || subnav.includes("Traffic"));
    assert.ok(
      subnav.includes("buildObserveTrafficInspectorPath") ||
        subnav.includes("panel=traffic") ||
        subnav.includes('panel: "traffic"')
    );
    const hub = read(OBSERVE_HUB);
    assert.ok(hub.includes("TrafficInspectorPageClient") || hub.includes("traffic"));
    assert.equal(hub.includes("OperationsTopbar"), false);
    const mounts = hub.match(/<ObserveHubSubnav\b/g) ?? [];
    assert.equal(mounts.length, 1, "exactly one Observe hub strip");
  });

  it("Header resolveDeepHeaderTitleFallback: all 10 peers (not catch-all Operations)", () => {
    for (const id of OPERATIONS_TOPBAR_IDS) {
      const path = buildOperationsPath(id);
      const title = resolveDeepHeaderTitleFallback(path);
      assert.equal(
        title,
        OPERATIONS_TOPBAR_LABELS[id],
        `${path} → peer title ${OPERATIONS_TOPBAR_LABELS[id]}, got ${title}`
      );
      assert.notEqual(title, "Operations", `${path} must not fall through to Operations`);
    }
  });

  it("Header hub root is Operations; labs/media not shadowed", () => {
    assert.equal(resolveDeepHeaderTitleFallback("/operations"), "Operations");
    assert.equal(resolveDeepHeaderTitleFallback("/operations/"), "Operations");
    assert.equal(resolveDeepHeaderTitleFallback(buildOperationsPath("labs")), "Labs");
    assert.equal(resolveDeepHeaderTitleFallback(buildOperationsPath("media")), "Media");
    assert.equal(resolveDeepHeaderTitleFallback("/dashboard/testing"), "Labs");
  });

  it("Header source has no code-level startsWith('/operations/') catch-all", () => {
    const header = read("src/shared/components/Header.tsx");
    // Residual anti-pattern: match body with broad prefix (comments documenting the ban are OK)
    const codeCatchAll =
      /match:\s*\([^)]*\)\s*=>[\s\S]{0,200}?p\.startsWith\(\s*["']\/operations\/["']\s*\)/.test(
        header
      );
    assert.equal(codeCatchAll, false, "Header must not match via p.startsWith(\"/operations/\")");
    assert.ok(header.includes("resolveDeepHeaderTitleFallback"));
    assert.ok(header.includes("OPERATIONS_TOPBAR_LABELS"));
    assert.ok(header.includes("matchOpsPeerPath"));
    for (const id of OPERATIONS_TOPBAR_IDS) {
      assert.ok(
        header.includes(`matchOpsPeerPath("${id}")`) ||
          header.includes(`"${id}"`) ||
          header.includes(`'${id}'`),
        `Header should cover peer ${id}`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// §8 success metrics → test map (documentation assert)
// ---------------------------------------------------------------------------

describe("0100 §8 success metrics coverage map", () => {
  it("documents metric → suite mapping (always green; Evidence table)", () => {
    const map: ReadonlyArray<{ metric: string; suite: string }> = [
      {
        metric: "exactly one internal topbar with 10 peers",
        suite: "0100 A layout sole mount + topbar ids length 10",
      },
      {
        metric: "no stacked Endpoint sub-topbars",
        suite: "0100 A no PageTabBar/CostsSubnav under operations/",
      },
      {
        metric: "Testing via Ops Labs/Media or redirects",
        suite: "0100 B 0099 row + D Testing redirect-only",
      },
      {
        metric: "canonical /operations/{id} + legacy redirects",
        suite: "0100 B matrix builders + redirect pages",
      },
      {
        metric: "Traffic on Observe not Ops",
        suite: "0100 B 0098 + C Traffic Observe active + E Observe chrome",
      },
      {
        metric: "CoreMCP naming",
        suite: "OPERATIONS_TOPBAR_LABELS[core-mcp] === CoreMCP (0086/0089)",
      },
      {
        metric: "Anti-phantom chrome tests Hard Rule #22",
        suite: "0100 A full tree mount scan",
      },
      {
        metric: "Header peer titles not residual catch-all",
        suite: "0100 E resolveDeepHeaderTitleFallback",
      },
    ];
    assert.ok(map.length >= 7);
    assert.equal(OPERATIONS_TOPBAR_LABELS["core-mcp"], "CoreMCP");
  });
});
