import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy plugins list → Operations Integrations stack (EPIC-20 Task 0094).
 * Nested `/dashboard/plugins/[name]/config` remains a live deep route.
 */
export default function PluginsPage() {
  redirect(buildOperationsPath("integrations"));
}
