import { redirect } from "next/navigation";
import { buildOperationsHubPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Operations hub (Task 0059) → canonical EPIC-20 hub root.
 * Matrix row: `/dashboard/operations` → `buildOperationsHubPath()` (owner 0087).
 */
export default function OperationsLegacyRedirectPage() {
  redirect(buildOperationsHubPath());
}
