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
} from "@/shared/constants/epic19Rebalance";

interface PolicyTabLink {
  href: string;
  /** sidebar namespace key (reuse costs labels) */
  labelKey: string;
  labelFallback: string;
  icon: string;
  /** When set, active on Dashboard story tab (Overview back-link). */
  storyTab?: "costs-overview";
}

const COSTS_OVERVIEW_HREF = buildDashboardStoryPath("costs-overview");

const POLICY_LINKS = [
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
] as const satisfies readonly PolicyTabLink[];

/**
 * @deprecated EPIC-19 / 0079 chrome unify (operator rework 2026-07-19).
 *
 * Budget / Pricing / Quota Sharing are **peers on `ProvidersTopBar`** — do **not**
 * mount this as a second strip under the hub topbar (multi-topbar = design-system fail).
 *
 * File retained archive-not-delete for import history / 0081 F3 reverse-discovery
 * reference (Overview → Dashboard costs-overview). Prefer CostsSubnav on the
 * storytelling surface for reverse links. Stop-mount: no Providers policy pages
 * render this component after 0079 rework.
 */
export default function ProvidersPolicySubnav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = asSidebarTranslator(useTranslations("sidebar"));

  return (
    <nav
      aria-label="Providers policy sections"
      className={cn("mb-6", HUB_SUBNAV_SHELL_CLASS)}
      data-providers-policy-subnav=""
    >
      {POLICY_LINKS.map((item) => {
        const isActive =
          "storyTab" in item && item.storyTab
            ? pathname === "/home" &&
              (searchParams.get("tab") ?? "overview") === item.storyTab
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

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
            data-providers-policy-link={item.href}
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
