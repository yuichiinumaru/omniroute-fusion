"use client";

import Link from "next/link";
import { cn } from "@/shared/utils/cn";
import {
  HUB_SUBNAV_ACTIVE_CLASS,
  HUB_SUBNAV_INACTIVE_CLASS,
  HUB_SUBNAV_ITEM_BASE_CLASS,
  HUB_SUBNAV_SHELL_CLASS,
} from "@/shared/constants/hubSubnavStyles";
import {
  PROVIDERS_BUDGET_PATH,
  PROVIDERS_PRICING_PATH,
  PROVIDERS_QUOTA_SHARE_PATH,
} from "@/shared/constants/epic19Rebalance";

/**
 * Peer provider surfaces that must mount this topbar with matching `currentPath`
 * (Task 0057 multi-route contract + 0079 chrome unify). Branded union prevents
 * path drift at call sites.
 *
 * Order (operator): Providers · Stats · Services · Quota · Rankings · Free Tiers ·
 * Runtime · Budget · Pricing · Quota Sharing — **exactly one** hub strip (no
 * secondary ProvidersPolicySubnav / CostsSubnav under this bar).
 */
export const PROVIDERS_TOPBAR_PATHS = [
  "/dashboard/providers",
  "/dashboard/provider-stats",
  "/dashboard/providers/services",
  "/dashboard/quota",
  "/dashboard/free-provider-rankings",
  "/dashboard/free-tiers",
  "/dashboard/runtime",
  PROVIDERS_BUDGET_PATH,
  PROVIDERS_PRICING_PATH,
  PROVIDERS_QUOTA_SHARE_PATH,
] as const;

export type ProvidersTopBarPath = (typeof PROVIDERS_TOPBAR_PATHS)[number];

const TOPBAR_LINKS: Array<{
  href: Exclude<ProvidersTopBarPath, "/dashboard/providers">;
  labelKey: string;
  fallback: string;
  icon: string;
}> = [
  {
    href: "/dashboard/provider-stats",
    labelKey: "topbarProviderStats",
    fallback: "Stats",
    icon: "analytics",
  },
  {
    href: "/dashboard/providers/services",
    labelKey: "topbarServices",
    fallback: "Services",
    icon: "hub",
  },
  {
    href: "/dashboard/quota",
    labelKey: "topbarQuota",
    fallback: "Quota",
    icon: "speed",
  },
  {
    href: "/dashboard/free-provider-rankings",
    labelKey: "topbarFreeRankings",
    fallback: "Rankings",
    icon: "leaderboard",
  },
  {
    href: "/dashboard/free-tiers",
    labelKey: "topbarFreeTiers",
    fallback: "Free Tiers",
    icon: "redeem",
  },
  {
    href: "/dashboard/runtime",
    labelKey: "topbarRuntime",
    fallback: "Runtime",
    icon: "terminal",
  },
  {
    href: PROVIDERS_BUDGET_PATH,
    labelKey: "topbarBudget",
    fallback: "Budget",
    icon: "savings",
  },
  {
    href: PROVIDERS_PRICING_PATH,
    labelKey: "topbarPricing",
    fallback: "Pricing",
    icon: "price_change",
  },
  {
    href: PROVIDERS_QUOTA_SHARE_PATH,
    labelKey: "topbarQuotaSharing",
    fallback: "Quota Sharing",
    icon: "pie_chart",
  },
];

type ProviderMessageTranslator = ((key: string, values?: Record<string, unknown>) => string) & {
  has?: (key: string) => boolean;
};

function providerText(
  t: ProviderMessageTranslator | undefined,
  key: string,
  fallback: string
): string {
  if (t && typeof t.has === "function" && t.has(key)) {
    return t(key);
  }
  return fallback;
}

export default function ProvidersTopBar({
  t,
  currentPath,
}: {
  t?: ProviderMessageTranslator;
  /** Exact peer route path — must match one of PROVIDERS_TOPBAR_PATHS. */
  currentPath?: ProvidersTopBarPath;
}) {
  const isProviders = currentPath === "/dashboard/providers";

  return (
    <nav
      className={cn(HUB_SUBNAV_SHELL_CLASS, "overflow-x-auto shrink-0 mb-4")}
      aria-label={providerText(t, "topbarNavLabel", "Providers navigation")}
      data-testid="providers-topbar"
    >
      <Link
        href="/dashboard/providers"
        className={cn(
          HUB_SUBNAV_ITEM_BASE_CLASS,
          "shrink-0",
          isProviders ? HUB_SUBNAV_ACTIVE_CLASS : HUB_SUBNAV_INACTIVE_CLASS
        )}
        aria-current={isProviders ? "page" : undefined}
      >
        <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
          dns
        </span>
        <span>{providerText(t, "topbarProviders", "Providers")}</span>
      </Link>
      {TOPBAR_LINKS.map((link) => {
        const isActive = currentPath === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              HUB_SUBNAV_ITEM_BASE_CLASS,
              "shrink-0",
              isActive ? HUB_SUBNAV_ACTIVE_CLASS : HUB_SUBNAV_INACTIVE_CLASS
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {link.icon}
            </span>
            <span>{providerText(t, link.labelKey, link.fallback)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
