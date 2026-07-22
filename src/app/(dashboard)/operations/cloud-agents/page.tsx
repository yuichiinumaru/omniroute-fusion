import CloudAgentsPageClient from "./CloudAgentsPageClient";

/**
 * EPIC-20 T20-F / Task 0091 — canonical Cloud Agents peer under Operations shell.
 * Path: `/operations/cloud-agents` via `buildOperationsPath("cloud-agents")`.
 * Topbar is layout-owned — this page is content only (no second hub chrome).
 */
export default function OperationsCloudAgentsPage() {
  return <CloudAgentsPageClient />;
}
