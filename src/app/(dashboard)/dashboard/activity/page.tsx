import ObserveHubClient from "./ObserveHubClient";

export const dynamic = "force-dynamic";

/**
 * Observe / Execution Stream hub (Epic 0005 S4).
 * Deep links: `?source=activity|request|proxy|console|audit|mcp|a2a`
 * Legacy paths under /dashboard/logs/* and /dashboard/audit/* redirect here.
 */
export default function ObserveHubPage() {
  return <ObserveHubClient />;
}
