import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy CLI Code list → Operations Agents fusion (EPIC-20 T20-E / 0090).
 * Detail routes `/dashboard/cli-code/[id]` remain (strategy A).
 */
export default function CliCodeListRedirectPage() {
  redirect(buildOperationsPath("agents"));
}
