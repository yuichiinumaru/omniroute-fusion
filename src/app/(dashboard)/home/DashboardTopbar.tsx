"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/shared/utils/cn";

interface TopbarLinkItem {
  href: string;
  labelKey: string;
  labelFallback: string;
  icon: string;
}

const DASHBOARD_LINKS: readonly TopbarLinkItem[] = [
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
] as const;

type SidebarTranslator = ((key: string) => string) & {
  has?: (key: string) => boolean;
};

export default function DashboardTopbar() {
  const pathname = usePathname();
  const t = useTranslations("sidebar") as SidebarTranslator;

  const getLabel = (item: TopbarLinkItem): string =>
    typeof t.has === "function" && t.has(item.labelKey) ? t(item.labelKey) : item.labelFallback;

  return (
    <nav
      aria-label="Dashboard navigation"
      className="mb-6 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-bg-subtle p-1"
    >
      {DASHBOARD_LINKS.map((item) => {
        const isActive =
          item.href === "/home" ? pathname === "/home" : pathname.startsWith(item.href);

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