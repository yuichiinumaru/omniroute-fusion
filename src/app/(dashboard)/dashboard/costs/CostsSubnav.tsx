"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils/cn";

interface CostsTabLink {
  href: string;
  /** sidebar namespace key */
  labelKey: string;
  labelFallback: string;
  icon: string;
}

const COSTS_LINKS: readonly CostsTabLink[] = [
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
] as const;

type SidebarTranslator = ((key: string) => string) & {
  has?: (key: string) => boolean;
};

export default function CostsSubnav() {
  const pathname = usePathname();
  const t = useTranslations("sidebar") as SidebarTranslator;

  const getLabel = (item: CostsTabLink): string =>
    typeof t.has === "function" && t.has(item.labelKey) ? t(item.labelKey) : item.labelFallback;

  return (
    <nav
      aria-label="Costs sections"
      className="mb-6 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-bg-subtle p-1"
    >
      {COSTS_LINKS.map((item) => {
        const isActive =
          item.href === "/dashboard/costs"
            ? pathname === "/dashboard/costs"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "focus-ring inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
              isActive
                ? "bg-surface text-text-main shadow-sm"
                : "text-text-muted hover:bg-surface/70 hover:text-text-main"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {item.icon}
            </span>
            {getLabel(item)}
          </Link>
        );
      })}
    </nav>
  );
}