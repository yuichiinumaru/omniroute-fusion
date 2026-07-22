import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Agent Skills → canonical EPIC-20 Skills peer.
 * Matrix row: `/dashboard/agent-skills` → `buildOperationsPath("skills")` (owner 0093).
 * Client tree kept for composition on the fused page — not deleted.
 */
export default function AgentSkillsLegacyRedirectPage() {
  redirect(buildOperationsPath("skills"));
}
