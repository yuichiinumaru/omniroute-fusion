import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Search Tools lab URL → Operations Labs peer (EPIC-20 T20-K / Task 0096).
 * Matrix: `/dashboard/search-tools` → `buildOperationsPath("labs")`.
 * Archive-not-delete: redirect shell; client remains for Labs composition.
 */
export default function LegacySearchToolsRedirectPage() {
  redirect(buildOperationsPath("labs"));
}
