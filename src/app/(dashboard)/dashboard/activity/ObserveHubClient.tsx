"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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
      <PageTabBar
        options={tabOptions}
        value={activeSource}
        onChange={handleSourceChange}
        syncSearchParam="source"
        defaultValue="activity"
        aria-label="Observe stream sources"
      />

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
