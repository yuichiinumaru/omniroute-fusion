import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy ACP Agents → canonical A2A/ACP Bridge stack (EPIC-20 / Task 0092).
 * Matrix: `/dashboard/acp-agents` → `buildOperationsPath("a2a-acp-bridge")`.
 * Client implementation: `./AcpAgentsPageClient.tsx` (archive-not-delete).
 */
export default function AcpAgentsLegacyRedirectPage() {
  redirect(buildOperationsPath("a2a-acp-bridge"));
}
