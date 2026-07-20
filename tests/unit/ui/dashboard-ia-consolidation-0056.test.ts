/**
 * Task 0056 — Dashboard IA consolidation regression guards (review F1).
 * Updated for EPIC-19 (0079–0082): topbar + costs point at Dashboard/Providers builders;
 * costs overview is a redirect shell; primary chrome no longer lists analytics/costs.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";
import { buildDashboardStoryPath } from "../../../src/shared/constants/epic19Rebalance";

const root = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

test("PRIMARY_SIDEBAR_ITEMS home entry is Dashboard (i18nKey + fallback)", () => {
  const home = PRIMARY_SIDEBAR_ITEMS.find((item) => item.id === "home");
  assert.ok(home, "home primary leaf must exist");
  assert.equal(home.id, "home");
  assert.equal(home.href, "/home");
  assert.equal(home.i18nKey, "dashboard");
  assert.equal(home.labelFallback, "Dashboard");
  assert.equal(home.exact, true);
});

test("DashboardTopbar exposes dashboard hubs via story builders (not retired peer routes)", () => {
  const src = read("src/app/(dashboard)/home/DashboardTopbar.tsx");
  // Operator peers: Dashboard/Home (bare /home) + Overview (?tab=overview) are distinct
  assert.ok(
    /href:\s*["']\/home["']/.test(src),
    "DashboardTopbar missing Dashboard/Home bare /home destination"
  );
  assert.ok(
    src.includes("buildDashboardStoryPath") ||
      src.includes(buildDashboardStoryPath("overview")),
    "DashboardTopbar missing Overview story destination"
  );
  assert.ok(
    src.includes("buildDashboardStoryPath") || src.includes("/home?tab="),
    "Costs (and overview) topbar links must use Dashboard story builders"
  );
  // Story peers live on the same single strip (0081 rework)
  for (const tab of ["overview", "evals", "search", "utilization", "compression", "costs-overview"]) {
    assert.ok(
      src.includes(`"${tab}"`) || src.includes(`'${tab}'`),
      `DashboardTopbar missing story peer ${tab}`
    );
  }
  assert.ok(src.includes('labelFallback: "Overview"'), "must label Overview peer");
  assert.ok(src.includes('labelFallback: "Dashboard"'), "must label Dashboard peer");
  assert.ok(src.includes('href: "/dashboard/cache"'));
  assert.ok(src.includes('href: "/dashboard/tokens"'));
  assert.ok(src.includes('href: "/dashboard/leaderboard"'));
  assert.ok(src.includes('href: "/dashboard/profile"'));
  // Must not dual-promote retired Analytics/Costs hubs as peer homes
  assert.equal(src.includes('href: "/dashboard/analytics"'), false);
  assert.equal(src.includes('href: "/dashboard/costs"'), false);
  assert.equal(src.includes("/dashboard/analytics/evals"), false);
  assert.equal(src.includes("/dashboard/analytics/combo-health"), false);
  // F2: at most one storyTab overview control (Overview only — Dashboard is bare /home)
  const overviewStoryTabs = src.match(/storyTab:\s*"overview"/g) ?? [];
  assert.equal(
    overviewStoryTabs.length,
    1,
    "exactly one topbar storyTab overview (no dual aria-current)"
  );
  assert.equal(/labelKey:\s*"analytics"/.test(src), false);
  assert.ok(src.includes('aria-label="Dashboard navigation"'));
  assert.ok(src.includes('data-dashboard-topbar=""'));
  assert.ok(src.includes("HUB_SUBNAV_SHELL_CLASS"));
  assert.ok(src.includes("asSidebarTranslator"));
  assert.ok(src.includes("sidebarText"));
  assert.ok(src.includes("as const satisfies"));
});

test("home/page.tsx mounts DashboardTopbar after setupComplete gate", () => {
  const src = read("src/app/(dashboard)/home/page.tsx");
  assert.ok(src.includes('import DashboardTopbar from "./DashboardTopbar"'));
  assert.ok(src.includes("<DashboardTopbar"));
  assert.ok(src.includes("setupComplete"));
  assert.ok(src.includes('redirect("/dashboard/onboarding")'));

  const setupIdx = src.indexOf("setupComplete");
  const redirectIdx = src.indexOf('redirect("/dashboard/onboarding")');
  const topbarIdx = src.indexOf("<DashboardTopbar");
  assert.ok(setupIdx >= 0 && redirectIdx > setupIdx, "onboarding redirect must follow setupComplete check");
  assert.ok(topbarIdx > redirectIdx, "DashboardTopbar must render only after the setupComplete redirect gate");
});

test("CostsSubnav lists Overview + Providers policy destinations (EPIC-19)", () => {
  const src = read("src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx");
  // Overview → Dashboard costs-overview (0081); config → Providers (0079)
  assert.ok(
    src.includes("buildDashboardStoryPath") ||
      src.includes(buildDashboardStoryPath("costs-overview")),
    "CostsSubnav Overview must target Dashboard costs-overview"
  );
  assert.ok(
    src.includes("buildProvidersBudgetPath") || src.includes("/dashboard/providers/budget"),
    "CostsSubnav Budget must target Providers budget"
  );
  assert.ok(
    src.includes("buildProvidersPricingPath") || src.includes("/dashboard/providers/pricing"),
    "CostsSubnav Pricing must target Providers pricing"
  );
  assert.ok(
    src.includes("buildProvidersQuotaSharePath") ||
      src.includes("/dashboard/providers/quota-share"),
    "CostsSubnav Quota Share must target Providers quota-share"
  );
  assert.equal(
    src.includes('href: "/dashboard/costs/budget"'),
    false,
    "Budget href must not remain on costs/budget after 0079"
  );
  assert.equal(
    src.includes('href: "/dashboard/costs"'),
    false,
    "Overview must leave legacy /dashboard/costs home"
  );
  assert.ok(src.includes('labelFallback: "Overview"'));
  assert.ok(src.includes('labelFallback: "Budget"'));
  assert.ok(src.includes('labelFallback: "Pricing"'));
  assert.ok(src.includes('labelFallback: "Quota Share"'));
  assert.ok(src.includes('aria-label="Costs sections"'));
  assert.ok(src.includes("HUB_SUBNAV_SHELL_CLASS"));
  assert.ok(src.includes("asSidebarTranslator"));
  assert.ok(src.includes("as const satisfies"));
});

test("costs overview is redirect shell; config routes redirect to Providers (0079/0081)", () => {
  const overview = read("src/app/(dashboard)/dashboard/costs/page.tsx");
  assert.ok(overview.includes("redirect"), "costs overview must be a server redirect shell");
  assert.ok(
    overview.includes("buildDashboardStoryPath") || overview.includes("costs-overview"),
    "overview must redirect to Dashboard costs-overview"
  );
  assert.equal(
    overview.includes("CostsSubnav"),
    false,
    "overview must not dual-host CostsSubnav content shell"
  );

  const redirectPages = [
    "src/app/(dashboard)/dashboard/costs/budget/page.tsx",
    "src/app/(dashboard)/dashboard/costs/pricing/page.tsx",
    "src/app/(dashboard)/dashboard/costs/quota-share/page.tsx",
  ];
  for (const rel of redirectPages) {
    const src = read(rel);
    assert.ok(src.includes("redirect"), `${rel} must redirect to Providers`);
    assert.equal(src.includes("CostsSubnav"), false, `${rel} must not mount CostsSubnav`);
  }
});

test("cache page is flattened: no activeView switcher; Prompt → Semantic → Reasoning stack", () => {
  const src = read("src/app/(dashboard)/dashboard/cache/page.tsx");

  assert.equal(src.includes("activeView"), false, "activeView must be removed");
  assert.equal(src.includes("CacheView"), false, "CacheView type must be removed");
  assert.equal(src.includes("setActiveView"), false, "setActiveView must be removed");

  // Section stack order (Prompt Cache → Semantic Cache → Reasoning Replay)
  const promptIdx = src.indexOf('t("promptCache")');
  const semanticIdx = src.indexOf('t("semanticCache")');
  const reasoningCommentIdx = src.indexOf("Reasoning Replay");
  const reasoningTabIdx = src.indexOf("<ReasoningCacheTab");

  assert.ok(promptIdx >= 0, "Prompt Cache section must remain");
  assert.ok(semanticIdx >= 0, "Semantic Cache section must remain");
  assert.ok(reasoningTabIdx >= 0, "ReasoningCacheTab must remain mounted");
  assert.ok(
    promptIdx < semanticIdx && semanticIdx < reasoningTabIdx,
    "expected Prompt → Semantic → Reasoning stack order"
  );
  assert.ok(
    reasoningCommentIdx < 0 || reasoningCommentIdx < reasoningTabIdx,
    "Reasoning Replay marker should precede ReasoningCacheTab when present"
  );
});
