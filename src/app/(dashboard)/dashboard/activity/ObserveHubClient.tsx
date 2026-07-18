"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CardSkeleton, ObserveHubSubnav } from "@/shared/components";
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

// Stream chrome lives in ObserveHubSubnav (Task 0061); hub only composes viewers.

function ObserveHubContent() {
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

  return (
    <div className="flex flex-col gap-6">
      <ObserveHubSubnav active={activeSource} />

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
