"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CardSkeleton, PageTabBar } from "@/shared/components";
import ProxyLogger from "@/shared/components/ProxyLogger";
import ConsoleLogViewer from "@/shared/components/ConsoleLogViewer";
import {
  type ObserveSource,
  OBSERVE_SOURCES,
  normalizeObserveSource,
} from "@/shared/constants/observeHub";
import { HEALTH_NAV_ITEM } from "@/shared/constants/sidebarVisibility";
import ActivityFeedClient from "./ActivityFeedClient";
import RequestLogsPanel from "../logs/RequestLogsPanel";
import ComplianceTab from "../audit/ComplianceTab";
import McpAuditTab from "../audit/McpAuditTab";
import A2aAuditTab from "../audit/A2aAuditTab";

const OBSERVE_TABS: Array<{
  id: ObserveSource;
  labelKey: string;
  label: string;
  icon: string;
}> = [
  { id: "activity", labelKey: "activity", label: "Activity", icon: "timeline" },
  { id: "request", labelKey: "logs", label: "Request Logs", icon: "description" },
  { id: "proxy", labelKey: "logsProxy", label: "Outbound Logs", icon: "lan" },
  { id: "console", labelKey: "consoleLogs", label: "Console", icon: "terminal" },
  { id: "audit", labelKey: "auditLog", label: "Audit", icon: "policy" },
  { id: "mcp", labelKey: "auditMcp", label: "MCP Audit", icon: "security" },
  { id: "a2a", labelKey: "auditA2a", label: "A2A Audit", icon: "device_hub" },
];

type SidebarTranslator = ((key: string, values?: Record<string, unknown>) => string) & {
  has?: (key: string) => boolean;
};

function sidebarText(t: SidebarTranslator, key: string, fallback: string) {
  return typeof t.has === "function" && t.has(key) ? t(key) : fallback;
}

function ObserveHubContent() {
  // SAFETY: next-intl's `useTranslations` returns a callable translator for the
  // requested namespace; current runtime versions also expose optional `.has()`.
  // `sidebarText` still guards `.has` with `typeof` before calling it, so this
  // alias only narrows the callable shape used by this component.
  const t = useTranslations("sidebar") as SidebarTranslator;
  const searchParams = useSearchParams();
  const [activeSource, setActiveSource] = useState<ObserveSource>(() =>
    normalizeObserveSource(searchParams.get("source") ?? searchParams.get("tab"))
  );
  const [initialRequestId] = useState(
    () => searchParams.get("id") || searchParams.get("request") || ""
  );

  useEffect(() => {
    setActiveSource(normalizeObserveSource(searchParams.get("source") ?? searchParams.get("tab")));
  }, [searchParams]);

  const tabOptions = useMemo(
    () =>
      OBSERVE_TABS.map((tab) => ({
        value: tab.id,
        label: sidebarText(t, tab.labelKey, tab.label),
        icon: tab.icon,
      })),
    [t]
  );

  const handleSourceChange = (next: string) => {
    const source = normalizeObserveSource(next);
    setActiveSource(source);
    // PageTabBar syncs ?source= (deletes for activity). Extra cleanup for request deep-links + legacy tab.
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (source !== "request") {
      url.searchParams.delete("id");
      url.searchParams.delete("request");
      url.searchParams.delete("connection");
    }
    url.searchParams.delete("tab");
    window.history.replaceState(null, "", url.toString());
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <PageTabBar
          options={tabOptions}
          value={activeSource}
          onChange={handleSourceChange}
          syncSearchParam="source"
          defaultValue="activity"
          aria-label="Observe stream sources"
        />
        {/* Task 0061: Health is a dashboard page, not a log-stream tab. */}
        <Link
          href={HEALTH_NAV_ITEM.href}
          data-observe-health-link
          className="focus-ring inline-flex shrink-0 items-center gap-2 self-start rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-main transition-colors hover:border-primary/30 hover:bg-bg-subtle hover:text-primary sm:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
            {HEALTH_NAV_ITEM.icon}
          </span>
          <span>{sidebarText(t, HEALTH_NAV_ITEM.i18nKey, HEALTH_NAV_ITEM.labelFallback ?? "Health")}</span>
          <span className="material-symbols-outlined text-[16px] text-text-muted" aria-hidden="true">
            arrow_forward
          </span>
        </Link>
      </div>

      <Suspense fallback={<CardSkeleton />}>
        {activeSource === "activity" ? <ActivityFeedClient /> : null}
        {activeSource === "request" ? (
          <RequestLogsPanel initialSelectedId={initialRequestId || null} />
        ) : null}
        {activeSource === "proxy" ? <ProxyLogger /> : null}
        {activeSource === "console" ? <ConsoleLogViewer /> : null}
        {activeSource === "audit" ? <ComplianceTab /> : null}
        {activeSource === "mcp" ? <McpAuditTab /> : null}
        {activeSource === "a2a" ? <A2aAuditTab /> : null}
      </Suspense>
    </div>
  );
}

export default function ObserveHubClient() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <ObserveHubContent />
    </Suspense>
  );
}

// Re-export helpers for convenience (tests may import from constants module directly).
export { normalizeObserveSource, OBSERVE_SOURCES };
export type { ObserveSource };
