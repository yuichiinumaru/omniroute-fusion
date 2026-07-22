import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy MCP Server home → EPIC-20 CoreMCP peer.
 * Matrix row: `/dashboard/mcp` → `buildOperationsPath("core-mcp")` (owner 0089).
 */
export default function McpLegacyRedirectPage() {
  redirect(buildOperationsPath("core-mcp"));
}
