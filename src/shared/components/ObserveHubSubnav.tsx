"use client";

import Link from "next/link";
import { cn } from "@/shared/utils/cn";
import { useTranslations } from "next-intl";
import type { ObserveSource } from "@/shared/constants/observeHub";
import {
  buildObserveComboHealthPath,
  buildObserveRouteTracePath,
  type ObserveOperationalPanel,
} from "@/shared/constants/epic19Rebalance";
import { HEALTH_NAV_ITEM } from "@/shared/constants/sidebarVisibility";
import {
  HUB_SUBNAV_ACTIVE_CLASS,
  HUB_SUBNAV_INACTIVE_CLASS,
  HUB_SUBNAV_ITEM_BASE_CLASS,
  HUB_SUBNAV_SHELL_CLASS,
} from "@/shared/constants/hubSubnavStyles";
import { asSidebarTranslator, sidebarText } from "@/shared/utils/sidebarI18n";

/**
 * Observe topbar active slot — stream sources + operational panels (`?panel=`) + Health.
 * Log streams stay on ObserveSource; combo-health / route-trace use panel= (0078/0080).
 * Health is a separate page, not a log stream or panel.
 * LINKS exhaustiveness is still asserted below.
 */
export type ObserveHubActive = ObserveSource | ObserveOperationalPanel | "health";

type ObserveHubLink = {
  readonly id: ObserveHubActive;
  readonly href: string;
  readonly labelKey: string;
  readonly label: string;
  readonly icon: string;
};

const LINKS = [
  { id: "activity", href: "/dashboard/activity", labelKey: "activity", label: "Activity", icon: "timeline" },
  { id: "request", href: "/dashboard/activity?source=request", labelKey: "logs", label: "Request Logs", icon: "description" },
  { id: "proxy", href: "/dashboard/activity?source=proxy", labelKey: "logsProxy", label: "Outbound Logs", icon: "lan" },
  { id: "console", href: "/dashboard/activity?source=console", labelKey: "consoleLogs", label: "Console", icon: "terminal" },
  { id: "audit", href: "/dashboard/activity?source=audit", labelKey: "auditLog", label: "Audit", icon: "policy" },
  { id: "mcp", href: "/dashboard/activity?source=mcp", labelKey: "auditMcp", label: "MCP Audit", icon: "security" },
  { id: "a2a", href: "/dashboard/activity?source=a2a", labelKey: "auditA2a", label: "A2A Audit", icon: "device_hub" },
  {
    id: "combo-health",
    href: buildObserveComboHealthPath(),
    labelKey: "analyticsComboHealth",
    label: "Combo Health",
    // Distinct from server Health (`health_and_safety`) — matches CommandPalette.
    icon: "monitor_heart",
  },
  {
    id: "route-trace",
    href: buildObserveRouteTracePath(),
    labelKey: "analyticsRouteTrace",
    label: "Route Trace",
    icon: "alt_route",
  },
  // Deep link — same path as OBSERVE_HEALTH_DEEP_LINK / HEALTH_NAV_ITEM (Task 0061).
  { id: "health", href: "/dashboard/health", labelKey: "health", label: "Health", icon: "health_and_safety" },
] as const satisfies readonly ObserveHubLink[];

/** Compile-time: every ObserveHubActive must appear exactly once in LINKS. */
type ObserveLinkIds = (typeof LINKS)[number]["id"];
type _AssertObserveLinksCoverActive = Exclude<ObserveHubActive, ObserveLinkIds> extends never
  ? Exclude<ObserveLinkIds, ObserveHubActive> extends never
    ? true
    : never
  : never;
const _observeLinksExhaustive: _AssertObserveLinksCoverActive = true;
void _observeLinksExhaustive;

export default function ObserveHubSubnav({ active }: { active: ObserveHubActive }) {
  const t = asSidebarTranslator(useTranslations("sidebar"));

  return (
    <nav
      aria-label="Observe sections"
      className={HUB_SUBNAV_SHELL_CLASS}
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
              "focus-ring",
              HUB_SUBNAV_ITEM_BASE_CLASS,
              isActive ? HUB_SUBNAV_ACTIVE_CLASS : HUB_SUBNAV_INACTIVE_CLASS
            )}
            aria-current={isActive ? "page" : undefined}
            data-observe-hub-link={link.id}
            data-observe-health-link={link.id === "health" ? "true" : undefined}
          >
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              {link.icon}
            </span>
            <span>{translatedLabel}</span>
          </Link>
        );
      })}
    </nav>
  );
}
