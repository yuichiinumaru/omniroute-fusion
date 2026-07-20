"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils/cn";
import { asSidebarTranslator, sidebarText } from "@/shared/utils/sidebarI18n";
import {
  HUB_SUBNAV_ACTIVE_CLASS,
  HUB_SUBNAV_INACTIVE_CLASS,
  HUB_SUBNAV_ITEM_BASE_CLASS,
  HUB_SUBNAV_SHELL_CLASS,
} from "@/shared/constants/hubSubnavStyles";
import {
  buildDashboardStoryPath,
  buildProvidersBudgetPath,
  buildProvidersPricingPath,
  buildProvidersQuotaSharePath,
  PROVIDERS_BUDGET_PATH,
  PROVIDERS_PRICING_PATH,
  PROVIDERS_QUOTA_SHARE_PATH,
} from "@/shared/constants/epic19Rebalance";

interface CostsTabLink {
  href: string;
  /** sidebar namespace key */
  labelKey: string;
  labelFallback: string;
  icon: string;
  /** Dashboard story tab id for Overview active-state matching */
  storyTab?: "costs-overview";
}

/**
 * Costs hub subnav (residual deep-link chrome after 0082 primary drop).
 * Overview → Dashboard storytelling (0081 / 0078 builder).
 * Budget / Pricing / Quota-share → Providers policy surfaces (0079).
 */
const COSTS_OVERVIEW_HREF = buildDashboardStoryPath("costs-overview");

const COSTS_LINKS = [
  {
    href: COSTS_OVERVIEW_HREF,
    labelKey: "costsOverview",
    labelFallback: "Overview",
    icon: "account_balance_wallet",
    storyTab: "costs-overview",
  },
  {
    href: buildProvidersBudgetPath(),
    labelKey: "costsBudget",
    labelFallback: "Budget",
    icon: "savings",
  },
  {
    href: buildProvidersPricingPath(),
    labelKey: "costsPricing",
    labelFallback: "Pricing",
    icon: "price_change",
  },
  {
    href: buildProvidersQuotaSharePath(),
    labelKey: "costsQuotaShare",
    labelFallback: "Quota Share",
    icon: "pie_chart",
  },
] as const satisfies readonly CostsTabLink[];

const PROVIDERS_POLICY_HREFS: ReadonlySet<string> = new Set([
  PROVIDERS_BUDGET_PATH,
  PROVIDERS_PRICING_PATH,
  PROVIDERS_QUOTA_SHARE_PATH,
]);

export default function CostsSubnav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = asSidebarTranslator(useTranslations("sidebar"));

  return (
    <nav
      aria-label="Costs sections"
      className={cn("mb-6", HUB_SUBNAV_SHELL_CLASS)}
      data-costs-subnav=""
    >
      {COSTS_LINKS.map((item) => {
        const isActive =
          "storyTab" in item && item.storyTab
            ? pathname === "/home" &&
              (searchParams.get("tab") ?? "overview") === item.storyTab
            : PROVIDERS_POLICY_HREFS.has(item.href)
              ? pathname === item.href || pathname.startsWith(`${item.href}/`)
              : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "focus-ring",
              HUB_SUBNAV_ITEM_BASE_CLASS,
              isActive ? HUB_SUBNAV_ACTIVE_CLASS : HUB_SUBNAV_INACTIVE_CLASS
            )}
            aria-current={isActive ? "page" : undefined}
            data-costs-subnav-link={item.href}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {item.icon}
            </span>
            {sidebarText(t, item.labelKey, item.labelFallback)}
          </Link>
        );
      })}
    </nav>
  );
}
