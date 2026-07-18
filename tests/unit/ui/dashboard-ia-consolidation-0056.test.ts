/**
 * Task 0056 — Dashboard IA consolidation regression guards (review F1).
 * Covers: sidebar Home→Dashboard i18nKey, DashboardTopbar wiring, CostsSubnav
 * on all costs leaves, and flattened /dashboard/cache (no activeView switcher).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  PRIMARY_SIDEBAR_ITEMS,
} from "../../../src/shared/constants/sidebarVisibility";

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

test("DashboardTopbar exposes the seven high-level dashboard hub links", () => {
  const src = read("src/app/(dashboard)/home/DashboardTopbar.tsx");
  const requiredHrefs = [
    "/home",
    "/dashboard/analytics",
    "/dashboard/costs",
    "/dashboard/cache",
    "/dashboard/tokens",
    "/dashboard/leaderboard",
    "/dashboard/profile",
  ];
  for (const href of requiredHrefs) {
    assert.ok(src.includes(`href: "${href}"`), `DashboardTopbar missing href: ${href}`);
  }
  // Density decision (subtask 3b): no Analytics deep tabs nested in the hub strip
  assert.equal(src.includes("/dashboard/analytics/evals"), false);
  assert.equal(src.includes("/dashboard/analytics/combo-health"), false);
  assert.ok(src.includes('aria-label="Dashboard navigation"'));
  // Shared hub visual contract + i18n helper (path-to-100 type/UI purity)
  assert.ok(src.includes("HUB_SUBNAV_SHELL_CLASS"));
  assert.ok(src.includes("asSidebarTranslator"));
  assert.ok(src.includes("sidebarText"));
  assert.ok(src.includes("as const satisfies"));
  // /home active state is exact-match (not prefix)
  assert.ok(src.includes('pathname === "/home"'));
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

test("CostsSubnav lists Overview / Budget / Pricing / Quota Share", () => {
  const src = read("src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx");
  const requiredHrefs = [
    "/dashboard/costs",
    "/dashboard/costs/budget",
    "/dashboard/costs/pricing",
    "/dashboard/costs/quota-share",
  ];
  for (const href of requiredHrefs) {
    assert.ok(src.includes(`href: "${href}"`), `CostsSubnav missing href: ${href}`);
  }
  assert.ok(src.includes('labelFallback: "Overview"'));
  assert.ok(src.includes('labelFallback: "Budget"'));
  assert.ok(src.includes('labelFallback: "Pricing"'));
  assert.ok(src.includes('labelFallback: "Quota Share"'));
  assert.ok(src.includes('aria-label="Costs sections"'));
  // Overview exact-match so /dashboard/costs/budget does not light Overview
  assert.ok(src.includes('pathname === "/dashboard/costs"'));
  assert.ok(src.includes("HUB_SUBNAV_SHELL_CLASS"));
  assert.ok(src.includes("asSidebarTranslator"));
  assert.ok(src.includes("as const satisfies"));
});

test("all four costs pages import and render CostsSubnav", () => {
  const pages = [
    "src/app/(dashboard)/dashboard/costs/page.tsx",
    "src/app/(dashboard)/dashboard/costs/budget/page.tsx",
    "src/app/(dashboard)/dashboard/costs/pricing/page.tsx",
    "src/app/(dashboard)/dashboard/costs/quota-share/page.tsx",
  ];
  for (const rel of pages) {
    const src = read(rel);
    assert.ok(
      src.includes("CostsSubnav"),
      `${rel} must import/render CostsSubnav`
    );
    assert.ok(
      src.includes("<CostsSubnav"),
      `${rel} must render <CostsSubnav />`
    );
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
