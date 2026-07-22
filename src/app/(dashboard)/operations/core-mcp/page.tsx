import CoreMcpPageClient from "./CoreMcpPageClient";

/**
 * EPIC-20 T20-D / Task 0089 — CoreMCP peer under Operations shell.
 * Path: `/operations/core-mcp` (static segment beats `[segment]` placeholder).
 * Chrome: layout-owned hub topbar only — this page is content-only.
 */
export default function CoreMcpPage() {
  return <CoreMcpPageClient />;
}
