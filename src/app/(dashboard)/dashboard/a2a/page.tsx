import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy A2A Server → canonical A2A/ACP Bridge stack (EPIC-20 / Task 0092).
 * Matrix: `/dashboard/a2a` → `buildOperationsPath("a2a-acp-bridge")`.
 * Client implementation: `./A2APageClient.tsx` (archive-not-delete).
 */
export default function A2ALegacyRedirectPage() {
  redirect(buildOperationsPath("a2a-acp-bridge"));
}
