import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy webhooks page → Operations Integrations stack (EPIC-20 Task 0094).
 * UI lives in `WebhooksPageClient`, mounted under `/operations/integrations`.
 */
export default function WebhooksPage() {
  redirect(buildOperationsPath("integrations"));
}
