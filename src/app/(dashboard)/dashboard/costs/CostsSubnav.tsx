"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils/cn";
import { asSidebarTranslator, sidebarText } from "@/shared/utils/sidebarI18n";
import {
  HUB_SUBNAV_ACTIVE_CLASS,
  HUB_SUBNAV_INACTIVE_CLASS,
  HUB_SUBNAV_ITEM_BASE_CLASS,
  HUB_SUBNAV_SHELL_CLASS,
} from "@/shared/constants/hubSubnavStyles";

interface CostsTabLink {
  href: string;
  /** sidebar namespace key */
  labelKey: string;
  labelFallback: string;
  icon: string;
}

const COSTS_LINKS = [
  {
    href: "/dashboard/costs",
    labelKey: "costsOverview",
    labelFallback: "Overview",
    icon: "account_balance_wallet",
  },
  {
    href: "/dashboard/costs/budget",
    labelKey: "costsBudget",
    labelFallback: "Budget",
    icon: "savings",
  },
  {
    href: "/dashboard/costs/pricing",
    labelKey: "costsPricing",
    labelFallback: "Pricing",
    icon: "price_change",
  },
  {
    href: "/dashboard/costs/quota-share",
    labelKey: "costsQuotaShare",
    labelFallback: "Quota Share",
    icon: "pie_chart",
  },
] as const satisfies readonly CostsTabLink[];

export default function CostsSubnav() {
  const pathname = usePathname();
  const t = asSidebarTranslator(useTranslations("sidebar"));

  return (
    <nav
      aria-label="Costs sections"
      className={cn("mb-6", HUB_SUBNAV_SHELL_CLASS)}
      data-costs-subnav=""
    >
      {COSTS_LINKS.map((item) => {
        // Overview is exact-match so /dashboard/costs/budget does not light Overview.
        const isActive =
          item.href === "/dashboard/costs"
            ? pathname === "/dashboard/costs"
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
