"use client";

import Link from "next/link";
import { cn } from "@/shared/utils/cn";

const TOPBAR_LINKS: Array<{
  href: string;
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
  currentPath?: string;
}) {
  const isProviders = currentPath === "/dashboard/providers";

  return (
    <nav
      className="flex flex-wrap items-center gap-1 rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-1 overflow-x-auto shrink-0 mb-4"
      aria-label={providerText(t, "topbarNavLabel", "Providers navigation")}
      data-testid="providers-topbar"
    >
      <Link
        href="/dashboard/providers"
        className={cn(
          "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all shrink-0",
          isProviders
            ? "border border-primary/20 bg-primary/10 text-primary"
            : "border border-transparent text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-main"
        )}
        aria-current={isProviders ? "page" : undefined}
      >
        <span className="material-symbols-outlined text-[16px]">dns</span>
        <span>{providerText(t, "topbarProviders", "Providers")}</span>
      </Link>
      {TOPBAR_LINKS.map((link) => {
        const isActive = currentPath === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all shrink-0",
              isActive
                ? "border border-primary/20 bg-primary/10 text-primary"
                : "border border-transparent text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-main"
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <span className="material-symbols-outlined text-[16px]">{link.icon}</span>
            <span>{providerText(t, link.labelKey, link.fallback)}</span>
          </Link>
        );
      })}
    </nav>
  );
}