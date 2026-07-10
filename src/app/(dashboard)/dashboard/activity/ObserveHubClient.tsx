"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { CardSkeleton } from "@/shared/components";
import ProxyLogger from "@/shared/components/ProxyLogger";
import ConsoleLogViewer from "@/shared/components/ConsoleLogViewer";
import { cn } from "@/shared/utils/cn";
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
  { id: "proxy", labelKey: "logsProxy", label: "Proxy Logs", icon: "lan" },
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

  const handleSourceChange = (source: ObserveSource) => {
    setActiveSource(source);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (source === "activity") url.searchParams.delete("source");
    else url.searchParams.set("source", source);
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
      <div
        role="tablist"
        aria-label="Observe stream sources"
        className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-bg-subtle p-1"
      >
        {OBSERVE_TABS.map((tab) => {
          const selected = activeSource === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => handleSourceChange(tab.id)}
              className={cn(
                "focus-ring inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
                selected
                  ? "bg-surface text-text-main shadow-sm"
                  : "text-text-muted hover:bg-surface/70 hover:text-text-main"
              )}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
                {tab.icon}
              </span>
              {sidebarText(t, tab.labelKey, tab.label)}
            </button>
          );
        })}
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
