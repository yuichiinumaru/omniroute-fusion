import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Batch lab URL → Operations Labs peer (EPIC-20 T20-K / Task 0096).
 * Matrix: `/dashboard/batch` → `buildOperationsPath("labs")`.
 * Archive-not-delete: redirect shell only; body lives in BatchPageClient + Labs fusion.
 */
export default function LegacyBatchRedirectPage() {
  redirect(buildOperationsPath("labs"));
}
