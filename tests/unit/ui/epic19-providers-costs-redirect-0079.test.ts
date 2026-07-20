/**
 * Task 0079 / EPIC-19 T19-B — Providers absorb budget / pricing / quota-share + redirects.
 * Uses 0078 SSoT builders only; does not drop the costs primary leaf (0082).
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PRIMARY_SIDEBAR_ITEM_IDS,
  PRIMARY_SIDEBAR_ITEMS,
  HIDEABLE_SIDEBAR_ITEM_IDS,
} from "../../../src/shared/constants/sidebarVisibility";
import {
  EPIC19_REDIRECT_MATRIX,
  PROVIDERS_BUDGET_PATH,
  PROVIDERS_PRICING_PATH,
  PROVIDERS_QUOTA_SHARE_PATH,
  buildProvidersBudgetPath,
  buildProvidersPricingPath,
  buildProvidersQuotaSharePath,
} from "../../../src/shared/constants/epic19Rebalance";

const root = join(import.meta.dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(root, rel), "utf8");
}

function exists(rel: string): boolean {
  return existsSync(join(root, rel));
}

const LEGACY_TO_CANONICAL = [
  {
    from: "/dashboard/costs/budget",
    to: buildProvidersBudgetPath(),
    legacyPage: "src/app/(dashboard)/dashboard/costs/budget/page.tsx",
    canonicalPage: "src/app/(dashboard)/dashboard/providers/budget/page.tsx",
  },
  {
    from: "/dashboard/costs/pricing",
    to: buildProvidersPricingPath(),
    legacyPage: "src/app/(dashboard)/dashboard/costs/pricing/page.tsx",
    canonicalPage: "src/app/(dashboard)/dashboard/providers/pricing/page.tsx",
  },
  {
    from: "/dashboard/costs/quota-share",
    to: buildProvidersQuotaSharePath(),
    legacyPage: "src/app/(dashboard)/dashboard/costs/quota-share/page.tsx",
    canonicalPage: "src/app/(dashboard)/dashboard/providers/quota-share/page.tsx",
  },
] as const;

describe("0079 — redirect matrix rows for costs config → Providers", () => {
  it("0078 matrix ownerTask 0079 rows map to Providers builders", () => {
    const rows = EPIC19_REDIRECT_MATRIX.filter((e) => e.ownerTask === "0079");
    assert.ok(rows.length >= 3, "at least three 0079 matrix rows");

    const byFrom = new Map(rows.map((r) => [r.from, r]));
    assert.equal(byFrom.get("/dashboard/costs/budget")?.to, PROVIDERS_BUDGET_PATH);
    assert.equal(byFrom.get("/dashboard/costs/pricing")?.to, PROVIDERS_PRICING_PATH);
    assert.equal(byFrom.get("/dashboard/costs/quota-share")?.to, PROVIDERS_QUOTA_SHARE_PATH);
    assert.equal(byFrom.get("/dashboard/usage?tab=budget")?.to, PROVIDERS_BUDGET_PATH);
    assert.equal(byFrom.get("/dashboard/settings/pricing")?.to, PROVIDERS_PRICING_PATH);

    for (const row of rows) {
      assert.equal(row.hub, "providers");
      assert.match(row.to, /^\/dashboard\/providers\/(budget|pricing|quota-share)$/);
    }
  });

  it("legacy costs config pages are server redirect shells using 0078 builders", () => {
    for (const { legacyPage, to } of LEGACY_TO_CANONICAL) {
      const src = read(legacyPage);
      assert.equal(
        src.includes('"use client"'),
        false,
        `${legacyPage} must be a server redirect (no use client)`
      );
      assert.ok(src.includes("redirect"), `${legacyPage} must call redirect()`);
      assert.ok(
        src.includes("from \"next/navigation\"") || src.includes("from 'next/navigation'"),
        `${legacyPage} must import redirect from next/navigation`
      );
      assert.ok(
        src.includes("epic19Rebalance"),
        `${legacyPage} must use epic19Rebalance builders (not ad-hoc path strings)`
      );
      // Destination builder product must appear via import usage or literal equal to builder
      assert.ok(
        src.includes("buildProvidersBudgetPath") ||
          src.includes("buildProvidersPricingPath") ||
          src.includes("buildProvidersQuotaSharePath") ||
          src.includes(to),
        `${legacyPage} must redirect to ${to}`
      );
      assert.equal(
        src.includes("CostsSubnav"),
        false,
        `${legacyPage} redirect shell must not mount CostsSubnav`
      );
      assert.equal(
        src.includes("BudgetTab") || src.includes("PricingTab") || src.includes("QuotaSharePageClient"),
        false,
        `${legacyPage} must not re-render UI (redirect only)`
      );
    }
  });

  it("usage?tab=budget and settings/pricing redirect to Providers builders", () => {
    const usage = read("src/app/(dashboard)/dashboard/usage/page.tsx");
    assert.ok(usage.includes("buildProvidersBudgetPath") || usage.includes(PROVIDERS_BUDGET_PATH));
    assert.equal(
      usage.includes('redirect("/dashboard/costs/budget")'),
      false,
      "usage budget branch must not target legacy costs/budget"
    );
    assert.ok(usage.includes('tab === "budget"'));

    const settingsPricing = read("src/app/(dashboard)/dashboard/settings/pricing/page.tsx");
    assert.ok(
      settingsPricing.includes("buildProvidersPricingPath") ||
        settingsPricing.includes(PROVIDERS_PRICING_PATH)
    );
    assert.equal(
      settingsPricing.includes('redirect("/dashboard/costs/pricing")'),
      false,
      "settings/pricing must not target legacy costs/pricing"
    );
  });

  it("costs overview is owned by 0081 (Dashboard redirect shell)", () => {
    // 0079 freezes Providers config only; 0081 turns overview into a redirect.
    const overview = read("src/app/(dashboard)/dashboard/costs/page.tsx");
    assert.ok(
      overview.includes("redirect"),
      "0081: costs overview redirects to Dashboard costs-overview"
    );
    assert.ok(
      overview.includes("buildDashboardStoryPath") ||
        overview.includes("costs-overview"),
      "0081 destination via Dashboard builder"
    );
    assert.equal(
      overview.includes("<CostOverviewTab"),
      false,
      "no dual content shell on costs overview"
    );
  });
});

describe("0079 — Providers canonical surfaces + single-topbar chrome", () => {
  const POLICY_PEERS = [
    {
      page: "src/app/(dashboard)/dashboard/providers/budget/page.tsx",
      pathConst: "PROVIDERS_BUDGET_PATH",
      path: PROVIDERS_BUDGET_PATH,
      body: "BudgetTab",
    },
    {
      page: "src/app/(dashboard)/dashboard/providers/pricing/page.tsx",
      pathConst: "PROVIDERS_PRICING_PATH",
      path: PROVIDERS_PRICING_PATH,
      body: "PricingTab",
    },
    {
      page: "src/app/(dashboard)/dashboard/providers/quota-share/page.tsx",
      pathConst: "PROVIDERS_QUOTA_SHARE_PATH",
      path: PROVIDERS_QUOTA_SHARE_PATH,
      body: "QuotaSharePageClient",
    },
  ] as const;

  it("canonical Providers pages exist and mount single ProvidersTopBar (no dual strip)", () => {
    for (const { page, pathConst, path, body } of POLICY_PEERS) {
      assert.ok(exists(page), `${page} must exist`);
      const src = read(page);
      assert.ok(src.includes("ProvidersTopBar"), `${page} must mount ProvidersTopBar`);
      assert.ok(
        src.includes(`currentPath={${pathConst}}`) ||
          src.includes(`currentPath="${path}"`) ||
          src.includes(`currentPath='${path}'`),
        `${page} must set currentPath to policy peer ${path}`
      );
      // Anti-phantom: no second policy strip, no CostsSubnav on Providers routes
      // Match import / JSX mount only — comments may still name the retired strip.
      assert.equal(
        /import\s+ProvidersPolicySubnav\b/.test(src) || /<ProvidersPolicySubnav\b/.test(src),
        false,
        `${page} must NOT mount ProvidersPolicySubnav (single topbar law)`
      );
      assert.equal(
        /import\s+CostsSubnav\b/.test(src) || /<CostsSubnav\b/.test(src),
        false,
        `${page} must NOT mount CostsSubnav`
      );
      // Exactly one hub topbar mount token
      const topbarMounts = src.match(/<ProvidersTopBar\b/g) ?? [];
      assert.equal(
        topbarMounts.length,
        1,
        `${page} must mount exactly one ProvidersTopBar`
      );
      assert.ok(src.includes(body), `${page} must render ${body}`);
    }
  });

  it("ProvidersTopBar exposes Budget / Pricing / Quota Sharing as peers (0078 paths)", () => {
    const topBar = read(
      "src/app/(dashboard)/dashboard/providers/components/ProvidersTopBar.tsx"
    );
    assert.ok(topBar.includes("PROVIDERS_TOPBAR_PATHS"));
    assert.ok(topBar.includes("data-testid=\"providers-topbar\"") || topBar.includes("providers-topbar"));
    // 0078 SSoT path constants (or builders) — not ad-hoc strings outside epic19Rebalance
    assert.ok(
      topBar.includes("PROVIDERS_BUDGET_PATH") ||
        topBar.includes("buildProvidersBudgetPath") ||
        topBar.includes(PROVIDERS_BUDGET_PATH)
    );
    assert.ok(
      topBar.includes("PROVIDERS_PRICING_PATH") ||
        topBar.includes("buildProvidersPricingPath") ||
        topBar.includes(PROVIDERS_PRICING_PATH)
    );
    assert.ok(
      topBar.includes("PROVIDERS_QUOTA_SHARE_PATH") ||
        topBar.includes("buildProvidersQuotaSharePath") ||
        topBar.includes(PROVIDERS_QUOTA_SHARE_PATH)
    );
    assert.ok(topBar.includes("epic19Rebalance"));
    assert.ok(topBar.includes('fallback: "Budget"') || topBar.includes("Budget"));
    assert.ok(topBar.includes('fallback: "Pricing"') || topBar.includes("Pricing"));
    assert.ok(
      topBar.includes('fallback: "Quota Sharing"') || topBar.includes("Quota Sharing")
    );
    // No nested dual-strip under topbar (import/JSX only)
    assert.equal(
      /import\s+ProvidersPolicySubnav\b/.test(topBar) || /<ProvidersPolicySubnav\b/.test(topBar),
      false,
      "TopBar must not import/mount PolicySubnav"
    );
  });

  it("ProvidersPolicySubnav is archive-not-delete (unmounted) after chrome unify", () => {
    assert.ok(
      exists(
        "src/app/(dashboard)/dashboard/providers/components/ProvidersPolicySubnav.tsx"
      ),
      "PolicySubnav file retained (archive-not-delete)"
    );
    const subnav = read(
      "src/app/(dashboard)/dashboard/providers/components/ProvidersPolicySubnav.tsx"
    );
    assert.ok(
      subnav.includes("@deprecated") || subnav.includes("do **not**"),
      "PolicySubnav must document stop-mount / deprecation"
    );
    // No live page under providers mounts it
    for (const { page } of POLICY_PEERS) {
      const src = read(page);
      assert.equal(
        /import\s+ProvidersPolicySubnav\b/.test(src) || /<ProvidersPolicySubnav\b/.test(src),
        false,
        `${page} must not mount deprecated PolicySubnav`
      );
    }
    const providersHome = read("src/app/(dashboard)/dashboard/providers/page.tsx");
    assert.equal(
      /import\s+ProvidersPolicySubnav\b/.test(providersHome) ||
        /<ProvidersPolicySubnav\b/.test(providersHome),
      false,
      "providers home must not mount PolicySubnav"
    );
  });

  it("quota-share implementation tree is archived-not-deleted (still importable)", () => {
    assert.ok(
      exists(
        "src/app/(dashboard)/dashboard/costs/quota-share/QuotaSharePageClient.tsx"
      ),
      "QuotaSharePageClient must remain (re-home import, not delete)"
    );
    const providersQuota = read(
      "src/app/(dashboard)/dashboard/providers/quota-share/page.tsx"
    );
    assert.ok(
      providersQuota.includes("quota-share/QuotaSharePageClient") ||
        providersQuota.includes("../quota-share") === false,
      "providers quota-share must import existing client"
    );
    // Explicit: import path points at costs tree or a re-export, not a blank page
    assert.ok(
      providersQuota.includes("QuotaSharePageClient"),
      "must reference QuotaSharePageClient"
    );
  });
});

describe("0079 — CostsSubnav config hrefs only; Overview owned by 0081", () => {
  it("retargets Budget / Pricing / Quota-share to Providers builders", () => {
    const src = read("src/app/(dashboard)/dashboard/costs/CostsSubnav.tsx");
    assert.ok(
      src.includes("buildProvidersBudgetPath") || src.includes(PROVIDERS_BUDGET_PATH)
    );
    assert.ok(
      src.includes("buildProvidersPricingPath") || src.includes(PROVIDERS_PRICING_PATH)
    );
    assert.ok(
      src.includes("buildProvidersQuotaSharePath") ||
        src.includes(PROVIDERS_QUOTA_SHARE_PATH)
    );
    // Overview → Dashboard (0081); must not keep legacy costs root as Overview home
    assert.ok(
      src.includes("buildDashboardStoryPath") || src.includes("costs-overview"),
      "0081: Overview points at Dashboard costs-overview"
    );
    assert.equal(
      src.includes('href: "/dashboard/costs"'),
      false,
      "Overview href must leave /dashboard/costs"
    );
    assert.equal(
      src.includes('href: "/dashboard/costs/budget"'),
      false,
      "Budget href must leave costs/budget"
    );
    assert.equal(
      src.includes('href: "/dashboard/costs/pricing"'),
      false,
      "Pricing href must leave costs/pricing"
    );
    assert.equal(
      src.includes('href: "/dashboard/costs/quota-share"'),
      false,
      "Quota-share href must leave costs/quota-share"
    );
  });
});

describe("0079 — no-new-leaf + hideable id archive-not-delete", () => {
  it("PRIMARY_SIDEBAR_ITEMS does not gain budget/pricing/quota-share peer leaves", () => {
    const forbidden = new Set(["budget", "pricing", "quota-share", "providers-budget"]);
    for (const item of PRIMARY_SIDEBAR_ITEMS) {
      assert.equal(
        forbidden.has(item.id),
        false,
        `must not add primary leaf id=${item.id}`
      );
    }
    // Task 0082: costs primary leaf dropped; Providers remains the config home.
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("costs"), false);
    assert.ok(PRIMARY_SIDEBAR_ITEM_IDS.includes("providers"));
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("budget"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("pricing"), false);
    assert.equal(PRIMARY_SIDEBAR_ITEM_IDS.includes("quota-share"), false);
  });

  it("keeps hideable ids costs-budget / costs-pricing / costs-quota-share", () => {
    const hideable = HIDEABLE_SIDEBAR_ITEM_IDS as readonly string[];
    assert.ok(hideable.includes("costs-budget"));
    assert.ok(hideable.includes("costs-pricing"));
    assert.ok(hideable.includes("costs-quota-share"));
  });
});
