import { redirect } from "next/navigation";
import { buildObserveComboHealthPath } from "@/shared/constants/epic19Rebalance";

/**
 * Legacy nested analytics route → Observe operational panel (EPIC-19 / Task 0080).
 * Was: rewrite to `?tab=combo-health` (now also redirected to Observe).
 */
export default function AnalyticsComboHealthPage() {
  redirect(buildObserveComboHealthPath());
}
