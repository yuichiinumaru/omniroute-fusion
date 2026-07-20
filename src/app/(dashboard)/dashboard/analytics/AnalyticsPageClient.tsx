"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { UsageAnalytics, CardSkeleton, PageTabBar } from "@/shared/components";
import EvalsTab from "../usage/components/EvalsTab";
import ProviderUtilizationTab from "./ProviderUtilizationTab";
import SearchAnalyticsTab from "./SearchAnalyticsTab";
import CompressionAnalyticsTab from "./CompressionAnalyticsTab";
import DiversityScoreCard from "./components/DiversityScoreCard";

/**
 * Archived storytelling shell (EPIC-19).
 * Live hub: `home/DashboardStoryHubClient.tsx` (Task 0081).
 * `analytics/page.tsx` is a redirect-only shell (ops → Observe, story → Dashboard).
 * Keep this module for archive-not-delete / import reference — not mounted as a route.
 */
type AnalyticsTab = "overview" | "evals" | "search" | "utilization" | "compression";

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
    id: "compression",
    labelKey: "compression",
    label: "Compression",
    icon: "compress",
  },
];

type AnalyticsTranslator = ((key: string, values?: Record<string, unknown>) => string) & {
  has?: (key: string) => boolean;
};

function analyticsText(t: AnalyticsTranslator, key: string, fallback: string) {
  return typeof t.has === "function" && t.has(key) ? t(key) : fallback;
}

function normalizeTab(tab: string | null): AnalyticsTab {
  if (
    tab === "evals" ||
    tab === "search" ||
    tab === "utilization" ||
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
        {activeTab === "compression" ? <CompressionAnalyticsTab /> : null}
      </Suspense>
    </div>
  );
}

export default function AnalyticsPageClient() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <AnalyticsPageContent />
    </Suspense>
  );
}
