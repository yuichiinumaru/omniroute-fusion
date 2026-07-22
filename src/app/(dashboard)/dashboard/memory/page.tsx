import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Memory URL → Operations Memory peer (EPIC-20 T20-J / Task 0095).
 * Canonical: `buildOperationsPath("memory")` → `/operations/memory`.
 * Covers `/dashboard/memory` and `?tab=memories|engine|playground` (query ignored;
 * matrix freezes plain peer path — stack sections, no tab chrome).
 * Archive-not-delete: keep this redirect shell so bookmarks keep working.
 */
export default function LegacyMemoryRedirectPage() {
  redirect(buildOperationsPath("memory"));
}
