import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Media lab URL → Operations Media peer (EPIC-20 T20-L / Task 0097).
 * Canonical: `buildOperationsPath("media")` → `/operations/media`.
 * Archive-not-delete: keep this redirect shell so bookmarks keep working.
 */
export default function LegacyCacheMediaRedirectPage() {
  redirect(buildOperationsPath("media"));
}
