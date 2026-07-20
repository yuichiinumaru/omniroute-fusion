"use client";

import { Suspense } from "react";
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
  isDashboardStoryTab,
  type DashboardStoryTab,
} from "@/shared/constants/epic19Rebalance";

/**
 * Topbar peer kinds:
 * - `home`: Dashboard/Home cockpit at bare `/home` (no story tab) — distinct from Overview.
 * - `story`: storytelling surface under `/home?tab=<DashboardStoryTab>`.
 * - `path`: sibling page under `/dashboard/*` (cache / tokens / leaderboard / profile).
 *
 * Exactly one peer may own each destination so only one `aria-current` is set.
 */
type TopbarLinkItem =
  | {
      kind: "home";
      href: "/home";
      labelKey: string;
      labelFallback: string;
      icon: string;
    }
  | {
      kind: "story";
      href: string;
      labelKey: string;
      labelFallback: string;
      icon: string;
      storyTab: DashboardStoryTab;
    }
  | {
      kind: "path";
      href: string;
      labelKey: string;
      labelFallback: string;
      icon: string;
    };

/**
 * Dashboard hub chrome (EPIC-19 / 0081 rework + operator peer list).
 * **Exactly one** topbar strip for the Dashboard hub.
 *
 * Peer order (operator):
 * Dashboard/Home · Overview (ex-analytics) · Evals · Search · Utilization ·
 * Compression · Costs · Cache · Tokens · Leaderboard · Profile
 *
 * Distinct destinations (no dual aria-current):
 * - Dashboard/Home → `/home` (HomePageClient cockpit)
 * - Overview → `/home?tab=overview` (UsageAnalytics + Diversity)
 */
const DASHBOARD_LINKS = [
  {
    kind: "home",
    href: "/home",
    labelKey: "dashboard",
    labelFallback: "Dashboard",
    icon: "home",
  },
  {
    kind: "story",
    href: buildDashboardStoryPath("overview"),
    labelKey: "overview",
    labelFallback: "Overview",
    icon: "analytics",
    storyTab: "overview",
  },
  {
    kind: "story",
    href: buildDashboardStoryPath("evals"),
    labelKey: "evals",
    labelFallback: "Evals",
    icon: "science",
    storyTab: "evals",
  },
  {
    kind: "story",
    href: buildDashboardStoryPath("search"),
    labelKey: "search",
    labelFallback: "Search",
    icon: "travel_explore",
    storyTab: "search",
  },
  {
    kind: "story",
    href: buildDashboardStoryPath("utilization"),
    labelKey: "utilization",
    labelFallback: "Utilization",
    icon: "monitoring",
    storyTab: "utilization",
  },
  {
    kind: "story",
    href: buildDashboardStoryPath("compression"),
    labelKey: "compression",
    labelFallback: "Compression",
    icon: "compress",
    storyTab: "compression",
  },
  {
    kind: "story",
    href: buildDashboardStoryPath("costs-overview"),
    labelKey: "costs",
    labelFallback: "Costs",
    icon: "payments",
    storyTab: "costs-overview",
  },
  {
    kind: "path",
    href: "/dashboard/cache",
    labelKey: "cache",
    labelFallback: "Cache",
    icon: "cached",
  },
  {
    kind: "path",
    href: "/dashboard/tokens",
    labelKey: "tokens",
    labelFallback: "Tokens",
    icon: "toll",
  },
  {
    kind: "path",
    href: "/dashboard/leaderboard",
    labelKey: "leaderboard",
    labelFallback: "Leaderboard",
    icon: "emoji_events",
  },
  {
    kind: "path",
    href: "/dashboard/profile",
    labelKey: "profile",
    labelFallback: "Profile",
    icon: "person",
  },
] as const satisfies readonly TopbarLinkItem[];

function DashboardTopbarNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = asSidebarTranslator(useTranslations("sidebar"));
  const rawTab = searchParams.get("tab");
  const onHome = pathname === "/home";
  /** True when a known story tab is selected (Overview / Evals / … / Costs). */
  const onStoryTab = Boolean(rawTab && isDashboardStoryTab(rawTab));

  return (
    <nav
      aria-label="Dashboard navigation"
      className={cn("mb-6", HUB_SUBNAV_SHELL_CLASS)}
      data-dashboard-topbar=""
    >
      {DASHBOARD_LINKS.map((item) => {
        let isActive = false;
        if (item.kind === "home") {
          // Bare /home (or unknown ?tab=) — never shares aria-current with Overview.
          isActive = onHome && !onStoryTab;
        } else if (item.kind === "story") {
          isActive = onHome && rawTab === item.storyTab;
        } else {
          isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
        }

        return (
          <Link
            key={`${item.href}-${item.labelKey}`}
            href={item.href}
            className={cn(
              "focus-ring",
              HUB_SUBNAV_ITEM_BASE_CLASS,
              isActive ? HUB_SUBNAV_ACTIVE_CLASS : HUB_SUBNAV_INACTIVE_CLASS
            )}
            aria-current={isActive ? "page" : undefined}
            data-dashboard-topbar-link={item.href}
            data-dashboard-topbar-peer={item.labelKey}
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

/**
 * Single-mount Dashboard hub topbar with Suspense for useSearchParams.
 * Mount on home and peer pages (cache / tokens / leaderboard / profile).
 */
export default function DashboardTopbar() {
  return (
    <Suspense fallback={null}>
      <DashboardTopbarNav />
    </Suspense>
  );
}
