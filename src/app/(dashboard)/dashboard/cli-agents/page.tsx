import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy CLI Agents list → Operations Agents fusion (EPIC-20 T20-E / 0090).
 * Detail routes `/dashboard/cli-agents/[id]` remain (strategy A).
 */
export default function CliAgentsListRedirectPage() {
  redirect(buildOperationsPath("agents"));
}
