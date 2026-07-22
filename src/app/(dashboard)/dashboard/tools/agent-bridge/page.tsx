import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Agent Bridge → canonical A2A/ACP Bridge stack (EPIC-20 / Task 0092).
 * Matrix: `/dashboard/tools/agent-bridge` → `buildOperationsPath("a2a-acp-bridge")`.
 * Implementation modules remain under this directory (archive-not-delete).
 */
export default function AgentBridgeLegacyRedirectPage() {
  redirect(buildOperationsPath("a2a-acp-bridge"));
}
