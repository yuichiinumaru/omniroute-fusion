/**
 * Task 0081 / EPIC-19 T19-D — Dashboard absorbs storytelling analytics tabs + costs overview.
 * Rework: **exactly one** DashboardTopbar strip (no PageTabBar + CostsSubnav stack).
 * Uses 0078 SSoT builders only; does not drop analytics/costs primary leaves (0082).
 * Does not re-host combo-health / route-trace (0080 Observe).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  HIDEABLE_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  DASHBOARD_STORY_HUB_PATH,
  DASHBOARD_STORY_TABS,
  EPIC19_REDIRECT_MATRIX,
  buildDashboardStoryPath,
  buildObserveComboHealthPath,
  buildObserveRouteTracePath,
  buildProvidersBudgetPath,
  buildProvidersPricingPath,
  buildProvidersQuotaSharePath,
  isDashboardStoryTab,
  type DashboardStoryTab,
} from "../../../src/shared/constants/epic19Rebalance";

const root = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function exists(rel: string): boolean {
  return existsSync(join(root, rel));
}

const HOME_PAGE = "src/app/(dashboard)/home/page.tsx";
const STORY_HUB = "src/app/(dashboard)/home/DashboardStoryHubClient.tsx";
const ANALYTICS_PAGE = "src/app/(dashboard)/dashboard/analytics/page.tsx";
const COSTS_PAGE = "src/app/(dashboard)/dashboard/costs/page.tsx";
const COSTS_SUBNAV = "src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx";
const TOPBAR = "src/app/(dashboard)/home/DashboardTopbar.tsx";
const PEER_PAGES = [
  "src/app/(dashboard)/dashboard/cache/page.tsx",
  "src/app/(dashboard)/dashboard/tokens/page.tsx",
  "src/app/(dashboard)/dashboard/leaderboard/page.tsx",
  "src/app/(dashboard)/dashboard/profile/page.tsx",
] as const;

const STORYTELLING_MATRIX_ROWS = [
  { from: "/dashboard/analytics", tab: "overview" as const },
  { from: "/dashboard/analytics?tab=overview", tab: "overview" as const },
  { from: "/dashboard/analytics?tab=evals", tab: "evals" as const },
  { from: "/dashboard/analytics/evals", tab: "evals" as const },
  { from: "/dashboard/analytics?tab=search", tab: "search" as const },
  { from: "/dashboard/analytics/search", tab: "search" as const },
  { from: "/dashboard/analytics?tab=utilization", tab: "utilization" as const },
  { from: "/dashboard/analytics/utilization", tab: "utilization" as const },
  { from: "/dashboard/analytics?tab=compression", tab: "compression" as const },
  { from: "/dashboard/analytics/compression", tab: "compression" as const },
  { from: "/dashboard/costs", tab: "costs-overview" as const },
] as const;

const NESTED_ANALYTICS_REDIRECTS = [
  {
    page: "src/app/(dashboard)/dashboard/analytics/evals/page.tsx",
    tab: "evals" as const,
  },
  {
    page: "src/app/(dashboard)/dashboard/analytics/search/page.tsx",
    tab: "search" as const,
  },
  {
    page: "src/app/(dashboard)/dashboard/analytics/utilization/page.tsx",
    tab: "utilization" as const,
  },
  {
    page: "src/app/(dashboard)/dashboard/analytics/compression/page.tsx",
    tab: "compression" as const,
  },
] as const;

describe("0081 — EPIC19 matrix rows for Dashboard storytelling redirects", () => {
  const story0081 = EPIC19_REDIRECT_MATRIX.filter((e) => e.ownerTask === "0081");

  it("owns analytics storytelling + costs overview rows (ownerTask 0081)", () => {
    const froms = story0081.map((e) => e.from).sort();
    const expected = STORYTELLING_MATRIX_ROWS.map((r) => r.from).sort();
    assert.deepEqual(froms, expected);
    for (const entry of story0081) {
      assert.equal(entry.hub, "dashboard");
      assert.ok(entry.to.startsWith(`${DASHBOARD_STORY_HUB_PATH}?tab=`));
    }
  });

  it("maps each storytelling from to buildDashboardStoryPath(tab)", () => {
    for (const { from, tab } of STORYTELLING_MATRIX_ROWS) {
      const row = EPIC19_REDIRECT_MATRIX.find((e) => e.from === from);
      assert.ok(row, `missing matrix row for ${from}`);
      assert.equal(row!.to, buildDashboardStoryPath(tab));
      assert.equal(row!.ownerTask, "0081");
    }
  });

  it("exposes all six Dashboard story tabs via SSoT", () => {
    assert.deepEqual([...DASHBOARD_STORY_TABS], [
      "overview",
      "evals",
      "search",
      "utilization",
      "compression",
      "costs-overview",
    ]);
    for (const tab of DASHBOARD_STORY_TABS) {
      assert.equal(isDashboardStoryTab(tab), true);
      assert.equal(buildDashboardStoryPath(tab), `/home?tab=${tab}`);
    }
    assert.equal(isDashboardStoryTab("combo-health"), false);
    assert.equal(isDashboardStoryTab("route-trace"), false);
  });
});

describe("0081 — Dashboard storytelling shell on /home (content only)", () => {
  it("home page mounts DashboardStoryHubClient (not bare HomePageClient only)", () => {
    assert.ok(exists(STORY_HUB), `${STORY_HUB} must exist`);
    const home = read(HOME_PAGE);
    assert.ok(
      home.includes("DashboardStoryHubClient") || home.includes("DashboardStoryHub"),
      "home/page.tsx must mount storytelling hub client"
    );
  });

  it("story hub mounts storytelling surfaces (archive-not-delete imports)", () => {
    const src = read(STORY_HUB);
    assert.ok(src.includes("HomePageClient"), "Dashboard/Home cockpit surface");
    assert.ok(src.includes("UsageAnalytics") || src.includes("overview"), "overview surface");
    assert.ok(src.includes("EvalsTab"), "evals surface");
    assert.ok(src.includes("SearchAnalyticsTab"), "search surface");
    assert.ok(src.includes("ProviderUtilizationTab"), "utilization surface");
    assert.ok(src.includes("CompressionAnalyticsTab"), "compression surface");
    assert.ok(src.includes("CostOverviewTab"), "costs-overview surface");
  });

  it("splits Dashboard/Home cockpit from Overview (ex-analytics) content", () => {
    const src = read(STORY_HUB);
    // Bare /home → cockpit only; ?tab=overview → analytics overview only
    assert.ok(
      /surface === ["']home["'][\s\S]*HomePageClient|HomePageClient[\s\S]*surface === ["']home["']/.test(
        src
      ) ||
        /=== ["']home["'][\s\S]*HomePageClient/.test(src),
      "HomePageClient must mount on home surface (not bundled into overview)"
    );
    assert.ok(
      /=== ["']overview["'][\s\S]*UsageAnalytics/.test(src),
      "UsageAnalytics must mount on overview surface"
    );
    // Must not keep the pre-split "overview shows both" bundle as the only path
    assert.equal(
      /activeTab === ["']overview["'][\s\S]*HomePageClient[\s\S]*UsageAnalytics/.test(src),
      false,
      "must not mount HomePageClient + UsageAnalytics together under overview"
    );
  });

  it("does not host combo-health / route-trace on Dashboard", () => {
    const src = read(STORY_HUB);
    assert.equal(src.includes("ComboHealthTab"), false);
    assert.equal(src.includes("RouteExplainabilityTab"), false);
    assert.equal(src.includes('id: "combo-health"'), false);
    assert.equal(src.includes('id: "route-trace"'), false);
    assert.equal(src.includes('value: "combo-health"'), false);
    assert.equal(src.includes('value: "route-trace"'), false);
  });

  it("story hub derives active tab from useSearchParams (URL is source of truth)", () => {
    const src = read(STORY_HUB);
    assert.ok(src.includes("useSearchParams"), "must read tab from URL");
    assert.ok(
      src.includes('searchParams.get("tab")') || src.includes("searchParams.get('tab')"),
      "must read ?tab= from searchParams on each render"
    );
    assert.equal(
      /useState\s*<\s*DashboardStoryTab\s*>\s*\(\s*\(\s*\)\s*=>/.test(src),
      false,
      "must not use useState<DashboardStoryTab>(() => ...) init-only for activeTab"
    );
    assert.equal(
      /const\s*\[\s*activeTab\s*,\s*setActiveTab\s*\]\s*=\s*useState/.test(src),
      false,
      "activeTab must not be local useState; URL is source of truth"
    );
  });
});

describe("0081 — single topbar chrome (anti-phantom rework)", () => {
  it("DashboardTopbar is the sole story navigation SSoT (operator peer list)", () => {
    const src = read(TOPBAR);
    assert.ok(src.includes('data-dashboard-topbar=""'), "must expose data-dashboard-topbar");
    assert.ok(src.includes('aria-label="Dashboard navigation"'));
    assert.ok(src.includes("buildDashboardStoryPath"));
    for (const tab of DASHBOARD_STORY_TABS) {
      assert.ok(
        src.includes(`buildDashboardStoryPath("${tab}")`) ||
          src.includes(`storyTab: "${tab}"`) ||
          src.includes(`"${tab}"`),
        `topbar must reference story tab ${tab}`
      );
    }
    // Operator peer labels: Dashboard/Home · Overview · Evals · Search · Utilization ·
    // Compression · Costs · Cache · Tokens · Leaderboard · Profile
    for (const label of [
      "Dashboard",
      "Overview",
      "Evals",
      "Search",
      "Utilization",
      "Compression",
      "Costs",
      "Cache",
      "Tokens",
      "Leaderboard",
      "Profile",
    ]) {
      assert.ok(
        src.includes(`labelFallback: "${label}"`),
        `topbar missing peer label ${label}`
      );
    }
    // Distinct destinations: bare /home cockpit vs ?tab=overview analytics
    assert.ok(
      /href:\s*["']\/home["']/.test(src) || src.includes('href: "/home"'),
      "Dashboard/Home peer must target bare /home"
    );
    assert.ok(
      src.includes('buildDashboardStoryPath("overview")') ||
        src.includes(buildDashboardStoryPath("overview")),
      "Overview peer must target story builder overview"
    );
    // Peer hubs
    assert.ok(src.includes('href: "/dashboard/cache"'));
    assert.ok(src.includes('href: "/dashboard/tokens"'));
    assert.ok(src.includes('href: "/dashboard/leaderboard"'));
    assert.ok(src.includes('href: "/dashboard/profile"'));
  });

  it("home mounts exactly one DashboardTopbar; story hub has zero nested strips", () => {
    const home = read(HOME_PAGE);
    const hub = read(STORY_HUB);

    const topbarMounts = home.match(/<DashboardTopbar\b/g) ?? [];
    assert.equal(topbarMounts.length, 1, "home must mount DashboardTopbar exactly once");

    // Anti-phantom: no nested story strip / costs strip mounts on story hub
    assert.equal(
      /import\s*\{[^}]*PageTabBar/.test(hub) ||
        /import\s+PageTabBar\b/.test(hub) ||
        /<PageTabBar\b/.test(hub),
      false,
      "story hub must NOT import/mount PageTabBar (nav lives in DashboardTopbar)"
    );
    assert.equal(
      /import\s+CostsSubnav\b/.test(hub) || /<CostsSubnav\b/.test(hub),
      false,
      "story hub must NOT import/mount CostsSubnav (no nested costs strip)"
    );
    assert.equal(
      /import\s*\{[^}]*PageTabBar/.test(home) || /<PageTabBar\b/.test(home),
      false,
      "home page must not mount PageTabBar"
    );
    assert.equal(
      /import\s+CostsSubnav\b/.test(home) || /<CostsSubnav\b/.test(home),
      false,
      "home page must not mount CostsSubnav"
    );
  });

  it("costs-overview content does not render CostsSubnav", () => {
    const hub = read(STORY_HUB);
    assert.equal(
      /import\s+CostsSubnav\b/.test(hub) || /<CostsSubnav\b/.test(hub),
      false,
      "costs-overview must not mount CostsSubnav"
    );
    assert.ok(hub.includes("CostOverviewTab"), "costs-overview still mounts CostOverviewTab");
    // costs-overview branch is content-only
    assert.ok(
      /costs-overview[\s\S]*CostOverviewTab/.test(hub) ||
        hub.includes('activeTab === "costs-overview"'),
      "costs-overview surface still wired"
    );
  });

  it("peer pages (cache/tokens/leaderboard/profile) mount the same DashboardTopbar", () => {
    for (const page of PEER_PAGES) {
      const src = read(page);
      assert.ok(
        src.includes("DashboardTopbar"),
        `${page} must import/mount DashboardTopbar`
      );
      const mounts = src.match(/<DashboardTopbar\b/g) ?? [];
      assert.equal(
        mounts.length,
        1,
        `${page} must render <DashboardTopbar /> exactly once`
      );
      // Single strip — no PageTabBar / CostsSubnav stack on peers either
      assert.equal(
        src.includes("PageTabBar"),
        false,
        `${page} must not stack PageTabBar`
      );
      assert.equal(
        src.includes("CostsSubnav"),
        false,
        `${page} must not stack CostsSubnav`
      );
    }
  });

  it("peer pages never early-return before DashboardTopbar (loading-safe chrome)", () => {
    // Regression: profile used to return a bare loading shell without the hub topbar.
    // Chrome must stay mounted on every render path for operator peer completeness.
    for (const page of PEER_PAGES) {
      const src = read(page);
      const topbarIdx = src.indexOf("<DashboardTopbar");
      assert.ok(topbarIdx >= 0, `${page} must contain <DashboardTopbar`);

      // Any early `if (loading) { return (` that appears *before* the topbar mount is a fail.
      const earlyReturnRe = /if\s*\(\s*loading\s*\)\s*\{[\s\S]*?return\s*\(/g;
      let match: RegExpExecArray | null;
      while ((match = earlyReturnRe.exec(src)) !== null) {
        assert.ok(
          match.index > topbarIdx,
          `${page}: loading early-return at ${match.index} must not precede DashboardTopbar at ${topbarIdx}`
        );
      }
    }
  });

  it("DashboardTopbar has single overview aria-current owner (F2) + distinct home peer", () => {
    const src = read(TOPBAR);
    const overviewStoryTabMatches = src.match(/storyTab:\s*"overview"/g) ?? [];
    assert.equal(
      overviewStoryTabMatches.length,
      1,
      "exactly one topbar item may use storyTab overview (no dual aria-current)"
    );
    assert.equal(
      /labelKey:\s*"analytics"/.test(src),
      false,
      "topbar must not dual-promote Analytics peer at overview"
    );
    // Dashboard/Home is NOT a second storyTab:overview — bare /home cockpit peer
    assert.ok(
      /kind:\s*["']home["']/.test(src) || /href:\s*["']\/home["']/.test(src),
      "must keep Dashboard/Home as distinct bare-/home peer"
    );
    // Active logic must not mark home active when a story tab is selected
    assert.ok(
      src.includes("onStoryTab") ||
        src.includes("isDashboardStoryTab") ||
        src.includes("!onStoryTab"),
      "home peer active state must exclude story-tab selections"
    );
  });

  it("DashboardTopbar retargets Analytics/Costs peer links to Dashboard story builders", () => {
    const src = read(TOPBAR);
    assert.ok(
      src.includes("buildDashboardStoryPath") ||
        src.includes(buildDashboardStoryPath("overview")) ||
        src.includes(buildDashboardStoryPath("costs-overview")),
      "topbar must use Dashboard story builders for storytelling peers"
    );
    assert.equal(
      src.includes('href: "/dashboard/analytics"'),
      false,
      "topbar must not advertise /dashboard/analytics as peer home"
    );
    assert.equal(
      src.includes('href: "/dashboard/costs"'),
      false,
      "topbar must not advertise /dashboard/costs as peer home"
    );
  });
});

describe("0081 — analytics + costs redirect shells (KEEP redirects)", () => {
  it("analytics page redirects storytelling tabs to Dashboard builders", () => {
    const src = read(ANALYTICS_PAGE);
    assert.ok(src.includes("redirect"), "must redirect");
    assert.ok(
      src.includes("buildDashboardStoryPath"),
      "must use buildDashboardStoryPath (0078 builder)"
    );
    assert.ok(src.includes("epic19Rebalance"), "must import epic19Rebalance");
    assert.ok(
      src.includes("buildObserveComboHealthPath") ||
        src.includes("buildObserveOperationalPanelPath"),
      "must keep Observe combo-health redirect"
    );
    assert.ok(
      src.includes("buildObserveRouteTracePath") ||
        src.includes("resolveEpic19RouteTraceDestination"),
      "must keep Observe route-trace redirect"
    );
    assert.equal(
      src.includes("<AnalyticsPageClient"),
      false,
      "analytics must not mount AnalyticsPageClient (no dual content shell)"
    );
    assert.equal(
      /raw !== ["']costs-overview["']/.test(src),
      false,
      "must not exclude costs-overview from analytics→Dashboard story resolution"
    );
  });

  it("nested analytics storytelling routes redirect to Dashboard builders", () => {
    for (const { page, tab } of NESTED_ANALYTICS_REDIRECTS) {
      const src = read(page);
      assert.ok(src.includes("redirect") || src.includes("permanentRedirect"));
      assert.ok(
        src.includes("buildDashboardStoryPath") ||
          src.includes(buildDashboardStoryPath(tab)),
        `${page} must target ${buildDashboardStoryPath(tab)}`
      );
      assert.ok(
        src.includes("epic19Rebalance") || src.includes(buildDashboardStoryPath(tab)),
        `${page} must use 0078 builder or exact destination`
      );
      assert.equal(
        src.includes('redirect("/dashboard/analytics?tab='),
        false,
        `${page} must not hop via analytics?tab= (direct Dashboard)`
      );
    }
  });

  it("costs overview page redirects to Dashboard costs-overview (no dual home)", () => {
    const src = read(COSTS_PAGE);
    assert.equal(
      src.includes('"use client"'),
      false,
      "costs overview must be a server redirect shell"
    );
    assert.ok(src.includes("redirect"), "must call redirect()");
    assert.ok(
      src.includes("buildDashboardStoryPath") ||
        src.includes(buildDashboardStoryPath("costs-overview")),
      "must redirect to costs-overview builder"
    );
    assert.ok(src.includes("epic19Rebalance") || src.includes("costs-overview"));
    assert.equal(
      src.includes("<CostOverviewTab"),
      false,
      "must not re-render CostOverviewTab (redirect only — anti dual-home)"
    );
    assert.equal(
      src.includes("<CostsSubnav"),
      false,
      "redirect shell must not mount CostsSubnav"
    );
  });

  it("nested combo-health still lands on Observe (0080 regression)", () => {
    const src = read(
      "src/app/(dashboard)/dashboard/analytics/combo-health/page.tsx"
    );
    assert.ok(
      src.includes("buildObserveComboHealthPath") ||
        src.includes(buildObserveComboHealthPath())
    );
    assert.equal(src.includes("buildDashboardStoryPath"), false);
  });
});

describe("0081 — CostsSubnav residual + Providers policy discoverability", () => {
  it("CostsSubnav Overview href uses Dashboard costs-overview builder (residual deep-link)", () => {
    const src = read(COSTS_SUBNAV);
    assert.ok(
      src.includes("buildDashboardStoryPath") ||
        src.includes(buildDashboardStoryPath("costs-overview")),
      "Overview must point at Dashboard costs-overview"
    );
    assert.equal(
      src.includes('href: "/dashboard/costs"'),
      false,
      "Overview must leave /dashboard/costs"
    );
    assert.ok(
      src.includes("buildProvidersBudgetPath") ||
        src.includes(buildProvidersBudgetPath())
    );
    assert.ok(
      src.includes("buildProvidersPricingPath") ||
        src.includes(buildProvidersPricingPath())
    );
    assert.ok(
      src.includes("buildProvidersQuotaSharePath") ||
        src.includes(buildProvidersQuotaSharePath())
    );
  });

  it("ProvidersPolicySubnav exposes Overview back-link to Dashboard costs-overview", () => {
    const src = read(
      "src/app/(dashboard)/dashboard/providers/components/ProvidersPolicySubnav.tsx"
    );
    assert.ok(
      src.includes("buildDashboardStoryPath") ||
        src.includes(buildDashboardStoryPath("costs-overview")),
      "policy strip must link Overview → Dashboard costs-overview for reverse discovery"
    );
    assert.ok(
      src.includes("costs-overview") ||
        src.includes("costsOverview") ||
        src.includes("Overview"),
      "policy strip must label Overview destination"
    );
  });

  it("HomePageClient analytics deep link points at Dashboard builder", () => {
    const src = read("src/app/(dashboard)/dashboard/HomePageClient.tsx");
    if (src.includes("/dashboard/analytics")) {
      assert.ok(
        src.includes("buildDashboardStoryPath") ||
          src.includes(buildDashboardStoryPath("overview")),
        "HomePageClient residual analytics link must use builder or destination"
      );
    }
  });
});

describe("0081 — no-new-leaf + hideable archive + Observe/Providers regression", () => {
  it("does not add primary leaves; analytics + costs dropped by 0082", () => {
    const forbidden = new Set([
      "evals",
      "utilization",
      "compression",
      "costs-overview",
      "storytelling",
      "analytics",
      "costs",
    ]);
    for (const item of PRIMARY_SIDEBAR_ITEMS) {
      assert.equal(
        forbidden.has(item.id),
        false,
        `must not add primary leaf id=${item.id}`
      );
    }
    assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("home"));
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("analytics"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("costs"), false);
  });

  it("keeps hideable analytics/costs prefs ids", () => {
    const hideable = HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[];
    assert.ok(hideable.includes("analytics") || hideable.includes("analytics-combo-health"));
    assert.ok(
      hideable.includes("costs") ||
        hideable.includes("costs-budget") ||
        hideable.includes("costs-pricing") ||
        hideable.includes("costs-quota-share")
    );
  });

  it("Observe operational destinations stay off Dashboard builders", () => {
    assert.equal(
      buildObserveComboHealthPath().startsWith(DASHBOARD_STORY_HUB_PATH),
      false
    );
    assert.equal(
      buildObserveRouteTracePath().startsWith(DASHBOARD_STORY_HUB_PATH),
      false
    );
    const ops = EPIC19_REDIRECT_MATRIX.filter((e) => e.ownerTask === "0080");
    for (const row of ops) {
      assert.equal(row.hub, "observe");
      assert.ok(!row.to.startsWith(DASHBOARD_STORY_HUB_PATH));
    }
  });

  it("Providers config destinations stay off Dashboard builders", () => {
    const providers = EPIC19_REDIRECT_MATRIX.filter((e) => e.ownerTask === "0079");
    for (const row of providers) {
      assert.equal(row.hub, "providers");
      assert.ok(!row.to.startsWith(DASHBOARD_STORY_HUB_PATH));
    }
  });
});

// Type-level smoke for story tab union exhaustiveness in tests
void (function _assertStoryTabs(tabs: readonly DashboardStoryTab[]) {
  return tabs;
})(DASHBOARD_STORY_TABS);
