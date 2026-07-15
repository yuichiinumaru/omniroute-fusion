"use client";

import Link from "next/link";

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
  t: ProviderMessageTranslator,
  key: string,
  fallback: string
): string {
  if (typeof t.has === "function" && t.has(key)) {
    return t(key);
  }
  return fallback;
}

export default function ProvidersTopBar({
  t,
  currentPath,
}: {
  t: ProviderMessageTranslator;
  currentPath?: string;
}) {
  return (
    <nav
      className="flex items-center gap-1 overflow-x-auto pb-1"
      aria-label={providerText(t, "topbarNavLabel", "Providers navigation")}
      data-testid="providers-topbar"
    >
      <Link
        href="/dashboard/providers"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
          currentPath === "/dashboard/providers"
            ? "bg-primary text-white border-primary"
            : "bg-bg-subtle border-border text-text-muted hover:text-text-primary hover:border-primary/30"
        }`}
      >
        <span className="material-symbols-outlined text-[14px]">dns</span>
        <span>{providerText(t, "topbarProviders", "Providers")}</span>
      </Link>
      {TOPBAR_LINKS.map((link) => {
        const isActive = currentPath === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
              isActive
                ? "bg-primary text-white border-primary"
                : "bg-bg-subtle border-border text-text-muted hover:text-text-primary hover:border-primary/30"
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">{link.icon}</span>
            <span>{providerText(t, link.labelKey, link.fallback)}</span>
          </Link>
        );
      })}
    </nav>
  );
}