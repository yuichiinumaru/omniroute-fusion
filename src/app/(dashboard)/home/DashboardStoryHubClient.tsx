"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UsageAnalytics, CardSkeleton } from "@/shared/components";
import {
  isDashboardStoryTab,
  type DashboardStoryTab,
} from "@/shared/constants/epic19Rebalance";
import HomePageClient from "../dashboard/HomePageClient";
import EvalsTab from "../dashboard/usage/components/EvalsTab";
import ProviderUtilizationTab from "../dashboard/analytics/ProviderUtilizationTab";
import SearchAnalyticsTab from "../dashboard/analytics/SearchAnalyticsTab";
import CompressionAnalyticsTab from "../dashboard/analytics/CompressionAnalyticsTab";
import DiversityScoreCard from "../dashboard/analytics/components/DiversityScoreCard";
import CostOverviewTab from "../dashboard/costs/CostOverviewTab";

/**
 * Dashboard storytelling content host (EPIC-19 / Task 0081 rework).
 * Hosts 0078 `DashboardStoryTab` surfaces on `/home?tab=`, plus the bare `/home`
 * cockpit (Dashboard/Home peer — not a story tab).
 *
 * **Chrome:** navigation lives solely in `DashboardTopbar` (single strip).
 * Content host only — no nested hub strips (anti-phantom / design system).
 *
 * Destinations (distinct peers, no dual aria-current):
 * - `/home` (no tab / unknown) → HomePageClient cockpit
 * - `?tab=overview` → UsageAnalytics + Diversity (ex-analytics Overview)
 * - other story tabs → respective surfaces
 */

type HubSurface = "home" | DashboardStoryTab;

function resolveHubSurface(tab: string | null): HubSurface {
  if (tab && isDashboardStoryTab(tab)) return tab;
  return "home";
}

type DashboardStoryHubClientProps = {
  machineId?: string;
};

function DashboardStoryHubContent({ machineId }: DashboardStoryHubClientProps) {
  const searchParams = useSearchParams();
  const surface = resolveHubSurface(searchParams.get("tab"));

  return (
    <div className="flex flex-col gap-6" data-dashboard-story-hub="">
      <Suspense fallback={<CardSkeleton />}>
        {surface === "home" ? <HomePageClient machineId={machineId} /> : null}
        {surface === "overview" ? (
          <>
            <UsageAnalytics />
            <DiversityScoreCard />
          </>
        ) : null}
        {surface === "evals" ? <EvalsTab /> : null}
        {surface === "search" ? <SearchAnalyticsTab /> : null}
        {surface === "utilization" ? <ProviderUtilizationTab /> : null}
        {surface === "compression" ? <CompressionAnalyticsTab /> : null}
        {surface === "costs-overview" ? <CostOverviewTab /> : null}
      </Suspense>
    </div>
  );
}

export default function DashboardStoryHubClient(props: DashboardStoryHubClientProps) {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <DashboardStoryHubContent {...props} />
    </Suspense>
  );
}
