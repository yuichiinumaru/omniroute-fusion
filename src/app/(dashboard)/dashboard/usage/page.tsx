import { redirect } from "next/navigation";
import { buildObserveHubPath } from "@/shared/constants/observeHub";
import { buildProvidersBudgetPath } from "@/shared/constants/epic19Rebalance";

/**
 * Legacy `/dashboard/usage` URLs.
 *
 * - Bare `/dashboard/usage` (and most tabs) → Observe request stream (S4).
 * - `?tab=limits` → Provider Limits at `/dashboard/quota` (pre-S4 home for
 *   ProviderQuotaWidget "View details" and similar deep links).
 * - `?tab=budget` → Providers budget surface (EPIC-19 / 0079; was costs/budget).
 */
export default async function UsageRedirectPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>> | Record<
    string,
    string | string[] | undefined
  >;
}) {
  const sp = searchParams instanceof Promise ? await searchParams : searchParams;
  const rawTab = sp?.tab;
  const tab = Array.isArray(rawTab) ? rawTab[0] : rawTab;

  if (tab === "limits") {
    redirect("/dashboard/quota");
  }
  if (tab === "budget") {
    redirect(buildProvidersBudgetPath());
  }

  redirect(buildObserveHubPath("request"));
}
