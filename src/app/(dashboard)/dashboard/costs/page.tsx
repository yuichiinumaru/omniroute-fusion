import { redirect } from "next/navigation";
import { buildDashboardStoryPath } from "@/shared/constants/epic19Rebalance";

/**
 * Legacy Costs overview → Dashboard storytelling (EPIC-19 / Task 0081).
 * Budget / pricing / quota-share remain under Providers (0079).
 * Extra query params (range, apiKeyIds, groupBy) are preserved for CostOverviewTab.
 */

function firstQueryValue(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function CostsPage({
  searchParams,
}: {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams instanceof Promise ? await searchParams : searchParams;
  const dest = new URL(buildDashboardStoryPath("costs-overview"), "http://local");

  if (sp) {
    for (const [key, raw] of Object.entries(sp)) {
      if (key === "tab") continue;
      const value = firstQueryValue(raw);
      if (value != null && value !== "") {
        dest.searchParams.set(key, value);
      }
    }
  }

  redirect(`${dest.pathname}?${dest.searchParams.toString()}`);
}
