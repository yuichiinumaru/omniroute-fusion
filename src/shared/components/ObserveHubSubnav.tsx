"use client";

import Link from "next/link";
import { cn } from "@/shared/utils/cn";
import { useTranslations } from "next-intl";
import { HEALTH_NAV_ITEM } from "@/shared/constants/sidebarVisibility";

export type ObserveHubActive =
  | "activity"
  | "request"
  | "proxy"
  | "console"
  | "audit"
  | "mcp"
  | "a2a"
  | "health";

const LINKS: Array<{
  id: ObserveHubActive;
  href: string;
  labelKey: string;
  label: string;
  icon: string;
}> = [
  { id: "activity", href: "/dashboard/activity", labelKey: "activity", label: "Activity", icon: "timeline" },
  { id: "request", href: "/dashboard/activity?source=request", labelKey: "logs", label: "Request Logs", icon: "description" },
  { id: "proxy", href: "/dashboard/activity?source=proxy", labelKey: "logsProxy", label: "Outbound Logs", icon: "lan" },
  { id: "console", href: "/dashboard/activity?source=console", labelKey: "consoleLogs", label: "Console", icon: "terminal" },
  { id: "audit", href: "/dashboard/activity?source=audit", labelKey: "auditLog", label: "Audit", icon: "policy" },
  { id: "mcp", href: "/dashboard/activity?source=mcp", labelKey: "auditMcp", label: "MCP Audit", icon: "security" },
  { id: "a2a", href: "/dashboard/activity?source=a2a", labelKey: "auditA2a", label: "A2A Audit", icon: "device_hub" },
  { id: "health", href: "/dashboard/health", labelKey: "health", label: "Health", icon: "health_and_safety" },
];

type SidebarTranslator = ((key: string, values?: Record<string, unknown>) => string) & {
  has?: (key: string) => boolean;
};

function sidebarText(t: SidebarTranslator, key: string, fallback: string) {
  return typeof t.has === "function" && t.has(key) ? t(key) : fallback;
}

export default function ObserveHubSubnav({ active }: { active: ObserveHubActive }) {
  // SAFETY: next-intl's `useTranslations` returns a callable translator for the
  // requested namespace; current runtime versions also expose optional `.has()`.
  // `sidebarText` still guards `.has` with `typeof` before calling it, so this
  // alias only narrows the callable shape used by this component.
  const t = useTranslations("sidebar") as SidebarTranslator;

  return (
    <nav
      aria-label="Observe sections"
      className="flex flex-wrap items-center gap-1 rounded-xl border border-black/8 dark:border-white/8 bg-black/[0.02] dark:bg-white/[0.02] p-1"
      data-observe-hub-subnav={active}
    >
      {LINKS.map((link) => {
        const isActive = link.id === active;
        const translatedLabel = link.id === "health"
          ? sidebarText(t, HEALTH_NAV_ITEM.i18nKey, HEALTH_NAV_ITEM.labelFallback ?? "Health")
          : sidebarText(t, link.labelKey, link.label);

        return (
          <Link
            key={link.id}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
              isActive
                ? "border border-primary/20 bg-primary/10 text-primary"
                : "border border-transparent text-text-muted hover:bg-black/5 dark:hover:bg-white/5 hover:text-text-main"
            )}
            aria-current={isActive ? "page" : undefined}
            data-observe-hub-link={link.id}
            data-observe-health-link={link.id === "health" ? "true" : undefined}
          >
            <span className="material-symbols-outlined text-[16px]">{link.icon}</span>
            <span>{translatedLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
