import { redirect } from "next/navigation";
import { buildProvidersBudgetPath } from "@/shared/constants/epic19Rebalance";

/**
 * Legacy costs budget URL → Providers budget (EPIC-19 T19-B / 0079).
 * Canonical: `buildProvidersBudgetPath()`.
 */
export default function CostsBudgetRedirectPage() {
  redirect(buildProvidersBudgetPath());
}
