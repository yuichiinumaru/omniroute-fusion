"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { UsageAnalytics, CardSkeleton, PageTabBar } from "@/shared/components";
import EvalsTab from "../usage/components/EvalsTab";
import ComboHealthTab from "./ComboHealthTab";
import ProviderUtilizationTab from "./ProviderUtilizationTab";
import RouteExplainabilityTab from "./RouteExplainabilityTab";
import SearchAnalyticsTab from "./SearchAnalyticsTab";
import CompressionAnalyticsTab from "./CompressionAnalyticsTab";
import DiversityScoreCard from "./components/DiversityScoreCard";

type AnalyticsTab =
  | "overview"
  | "evals"
  | "search"
  | "utilization"
  | "combo-health"
  | "compression"
  | "route-trace";

const ANALYTICS_TABS: Array<{
  id: AnalyticsTab;
  labelKey: string;
  label: string;
  icon: string;
}> = [
  { id: "overview", labelKey: "overview", label: "Overview", icon: "analytics" },
  { id: "evals", labelKey: "evals", label: "Evals", icon: "science" },
  { id: "search", labelKey: "search", label: "Search", icon: "travel_explore" },
  { id: "utilization", labelKey: "utilization", label: "Utilization", icon: "monitoring" },
  {
    id: "combo-health",
    labelKey: "comboHealth",
    label: "Combo Health",
    icon: "health_and_safety",
  },
  {
    id: "compression",
    labelKey: "compression",
    label: "Compression",
    icon: "compress",
  },
  { id: "route-trace", labelKey: "routeTrace", label: "Route Trace", icon: "alt_route" },
];

type AnalyticsTranslator = ((key: string, values?: Record<string, unknown>) => string) & {
  has?: (key: string) => boolean;
};

function analyticsText(t: AnalyticsTranslator, key: string, fallback: string) {
  return typeof t.has === "function" && t.has(key) ? t(key) : fallback;
}

function normalizeTab(tab: string | null): AnalyticsTab {
  if (tab === "route-trace" || tab === "route-explain") return "route-trace";
  if (
    tab === "evals" ||
    tab === "search" ||
    tab === "utilization" ||
    tab === "combo-health" ||
    tab === "compression"
  ) {
    return tab;
  }
  return "overview";
}

function AnalyticsPageContent() {
  const t = useTranslations("analytics") as AnalyticsTranslator;
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<AnalyticsTab>(normalizeTab(searchParams.get("tab")));
  const [initialRequestId] = useState(searchParams.get("id") || "");

  useEffect(() => {
    if (searchParams.get("tab") !== "route-explain") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "route-trace");
    window.history.replaceState(null, "", url.toString());
  }, [searchParams]);

  const tabOptions = useMemo(
    () =>
      ANALYTICS_TABS.map((tab) => ({
        value: tab.id,
        label: analyticsText(t, tab.labelKey, tab.label),
        icon: tab.icon,
      })),
    [t]
  );

  const handleTabChange = (tab: string) => {
    // Normalize aliases (route-explain → route-trace) and unknown values → overview
    setActiveTab(normalizeTab(tab));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageTabBar
        options={tabOptions}
        value={activeTab}
        onChange={handleTabChange}
        syncSearchParam="tab"
        defaultValue="overview"
        // Single replaceState: drop route-trace deep-link id when leaving that tab
        deleteParams={(next) => (next === "route-trace" ? [] : ["id"])}
        aria-label="Analytics sections"
      />

      <Suspense fallback={<CardSkeleton />}>
        {activeTab === "overview" ? (
          <>
            <UsageAnalytics />
            <DiversityScoreCard />
          </>
        ) : null}
        {activeTab === "evals" ? <EvalsTab /> : null}
        {activeTab === "search" ? <SearchAnalyticsTab /> : null}
        {activeTab === "utilization" ? <ProviderUtilizationTab /> : null}
        {activeTab === "combo-health" ? <ComboHealthTab /> : null}
        {activeTab === "compression" ? <CompressionAnalyticsTab /> : null}
        {activeTab === "route-trace" ? (
          <RouteExplainabilityTab initialRequestId={initialRequestId} />
        ) : null}
      </Suspense>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <AnalyticsPageContent />
    </Suspense>
  );
}
