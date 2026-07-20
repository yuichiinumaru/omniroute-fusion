import { redirect } from "next/navigation";
import {
  buildDashboardStoryPath,
  buildObserveComboHealthPath,
  isDashboardStoryTab,
  resolveEpic19RouteTraceDestination,
  type DashboardStoryTab,
} from "@/shared/constants/epic19Rebalance";

/**
 * Legacy Analytics hub — redirect shell (EPIC-19).
 *
 * Operational tabs → Observe (Task 0080):
 * - `?tab=combo-health` → `/dashboard/activity?panel=combo-health`
 * - `?tab=route-trace` / `route-explain` (+ optional `id=`) → Observe route-trace
 *
 * Storytelling tabs → Dashboard (Task 0081):
 * - bare / `overview` / `evals` / `search` / `utilization` / `compression`
 *   → `/home?tab=<id>` via `buildDashboardStoryPath`
 *
 * Content modules remain under `analytics/` for re-home import (archive-not-delete).
 */

function firstQueryValue(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function resolveStoryTab(raw: string | undefined): DashboardStoryTab {
  // Accept full Dashboard story set (including costs-overview) so mis-bookmarked
  // analytics URLs still land on the canonical Dashboard tab, not a silent overview.
  if (raw && isDashboardStoryTab(raw)) {
    return raw;
  }
  return "overview";
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams instanceof Promise ? await searchParams : searchParams;
  const tab = firstQueryValue(sp?.tab)?.trim().toLowerCase();
  const id = firstQueryValue(sp?.id);

  if (tab === "combo-health") {
    redirect(buildObserveComboHealthPath());
  }
  if (tab === "route-trace" || tab === "route-explain") {
    redirect(resolveEpic19RouteTraceDestination(id));
  }

  redirect(buildDashboardStoryPath(resolveStoryTab(tab)));
}
