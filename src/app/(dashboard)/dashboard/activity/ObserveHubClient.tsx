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
        {renderObserveSourcePanel(activeSource, initialRequestId)}
      </Suspense>
    </div>
  );
}

/** Exhaustive panel dispatch — adding an ObserveSource without a panel fails typecheck. */
function renderObserveSourcePanel(source: ObserveSource, initialRequestId: string) {
  switch (source) {
    case "activity":
      return <ActivityFeedClient />;
    case "request":
      return <RequestLogsPanel initialSelectedId={initialRequestId || null} />;
    case "proxy":
      return <ProxyLogger />;
    case "console":
      return <ConsoleLogViewer />;
    case "audit":
      return <ComplianceTab />;
    case "mcp":
      return <McpAuditTab />;
    case "a2a":
      return <A2aAuditTab />;
    default: {
      const _exhaustive: never = source;
      return _exhaustive;
    }
  }
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
