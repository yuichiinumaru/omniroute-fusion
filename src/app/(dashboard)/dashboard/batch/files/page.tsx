import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Batch Files lab URL → Operations Labs (EPIC-20 T20-K / Task 0096).
 * Matrix: `/dashboard/batch/files` → Labs; `?section=files` expands Files subsection.
 * Archive-not-delete: redirect shell only; body lives in BatchFilesPageClient + Labs fusion.
 */
export default function LegacyBatchFilesRedirectPage() {
  redirect(`${buildOperationsPath("labs")}?section=files`);
}
