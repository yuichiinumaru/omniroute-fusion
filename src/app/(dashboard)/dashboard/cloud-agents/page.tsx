import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Cloud Agents (pre-EPIC-20) → canonical Operations peer.
 * Matrix row: `/dashboard/cloud-agents` → `buildOperationsPath("cloud-agents")` (owner 0091).
 */
export default function CloudAgentsLegacyRedirectPage() {
  redirect(buildOperationsPath("cloud-agents"));
}
