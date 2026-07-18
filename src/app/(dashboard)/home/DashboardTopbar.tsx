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

interface TopbarLinkItem {
  href: string;
  labelKey: string;
  labelFallback: string;
  icon: string;
}

const DASHBOARD_LINKS = [
  {
    href: "/home",
    labelKey: "dashboard",
    labelFallback: "Dashboard",
    icon: "dashboard",
  },
  {
    href: "/dashboard/analytics",
    labelKey: "analytics",
    labelFallback: "Analytics",
    icon: "analytics",
  },
  {
    href: "/dashboard/costs",
    labelKey: "costs",
    labelFallback: "Costs",
    icon: "payments",
  },
  {
    href: "/dashboard/cache",
    labelKey: "cache",
    labelFallback: "Cache",
    icon: "cached",
  },
  {
    href: "/dashboard/tokens",
    labelKey: "tokens",
    labelFallback: "Tokens",
    icon: "toll",
  },
  {
    href: "/dashboard/leaderboard",
    labelKey: "leaderboard",
    labelFallback: "Leaderboard",
    icon: "emoji_events",
  },
  {
    href: "/dashboard/profile",
    labelKey: "profile",
    labelFallback: "Profile",
    icon: "person",
  },
] as const satisfies readonly TopbarLinkItem[];

export default function DashboardTopbar() {
  const pathname = usePathname();
  const t = asSidebarTranslator(useTranslations("sidebar"));

  return (
    <nav
      aria-label="Dashboard navigation"
      className={cn("mb-6", HUB_SUBNAV_SHELL_CLASS)}
      data-dashboard-topbar=""
    >
      {DASHBOARD_LINKS.map((item) => {
        const isActive =
          item.href === "/home" ? pathname === "/home" : pathname.startsWith(item.href);

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
            data-dashboard-topbar-link={item.href}
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
