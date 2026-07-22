"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CardSkeleton, ObserveHubSubnav } from "@/shared/components";
import ProxyLogger from "@/shared/components/ProxyLogger";
import ConsoleLogViewer from "@/shared/components/ConsoleLogViewer";
import {
  type ObserveSource,
  OBSERVE_SOURCES,
  normalizeObserveSource,
} from "@/shared/constants/observeHub";
import {
  isObserveOperationalPanel,
  type ObserveOperationalPanel,
} from "@/shared/constants/epic19Rebalance";
import type { ObserveHubActive } from "@/shared/components/ObserveHubSubnav";
import ActivityFeedClient from "./ActivityFeedClient";
import RequestLogsPanel from "../logs/RequestLogsPanel";
import ComplianceTab from "../audit/ComplianceTab";
import McpAuditTab from "../audit/McpAuditTab";
import A2aAuditTab from "../audit/A2aAuditTab";
import ComboHealthTab from "../analytics/ComboHealthTab";
import RouteExplainabilityTab from "../analytics/RouteExplainabilityTab";
import { TrafficInspectorPageClient } from "../tools/traffic-inspector/TrafficInspectorPageClient";

// Stream chrome lives in ObserveHubSubnav (Task 0061); hub only composes viewers.
// Operational panels (combo-health / route-trace / traffic) use ?panel= — 0080 / 0098.

function normalizeOperationalPanel(
  raw: string | null | undefined
): ObserveOperationalPanel | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  return isObserveOperationalPanel(value) ? value : null;
}

function ObserveHubContent() {
  const searchParams = useSearchParams();
  // Derive from URL — no setState-in-effect (searchParams already drives re-render).
  const activeSource = normalizeObserveSource(
    searchParams.get("source") ?? searchParams.get("tab")
  );
  const operationalPanel = normalizeOperationalPanel(searchParams.get("panel"));
  // Freeze deep-link id at first paint (request-logs / route-trace selection).
  const [initialRequestId] = useState(
    () => searchParams.get("id") || searchParams.get("request") || ""
  );

  const subnavActive: ObserveHubActive = operationalPanel ?? activeSource;

  return (
    <div className="flex flex-col gap-6">
      <ObserveHubSubnav active={subnavActive} />

      <Suspense fallback={<CardSkeleton />}>
        {operationalPanel
          ? renderOperationalPanel(operationalPanel, initialRequestId)
          : renderObserveSourcePanel(activeSource, initialRequestId)}
      </Suspense>
    </div>
  );
}

/** Exhaustive operational panel dispatch (`?panel=`). */
function renderOperationalPanel(panel: ObserveOperationalPanel, initialRequestId: string) {
  switch (panel) {
    case "combo-health":
      return <ComboHealthTab />;
    case "route-trace":
      return <RouteExplainabilityTab initialRequestId={initialRequestId} />;
    case "traffic":
      return <TrafficInspectorPageClient />;
    default: {
      const _exhaustive: never = panel;
      return _exhaustive;
    }
  }
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
