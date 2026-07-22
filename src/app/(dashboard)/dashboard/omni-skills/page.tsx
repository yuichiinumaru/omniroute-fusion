import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Omni Skills (Core Skills) → canonical EPIC-20 Skills peer.
 * Matrix row: `/dashboard/omni-skills` → `buildOperationsPath("skills")` (owner 0093).
 * Client tree kept for composition on the fused page — not deleted.
 */
export default function OmniSkillsLegacyRedirectPage() {
  redirect(buildOperationsPath("skills"));
}
