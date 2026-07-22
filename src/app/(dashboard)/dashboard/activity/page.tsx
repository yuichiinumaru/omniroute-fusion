import ObserveHubClient from "./ObserveHubClient";

export const dynamic = "force-dynamic";

/**
 * Observe / Execution Stream hub (Epic 0005 S4 + EPIC-19 T19-C + EPIC-20 T20-M).
 * Stream deep links: `?source=activity|request|proxy|console|audit|mcp|a2a`
 * Operational panels: `?panel=combo-health|route-trace|traffic` (+ optional `id=` on route-trace)
 * Legacy paths under /dashboard/logs/* and /dashboard/audit/* redirect here.
 * Analytics operational tabs redirect here via epic19Rebalance builders (Task 0080).
 * Traffic Inspector: `/dashboard/activity?panel=traffic` (0098); legacy tools path redirects.
 */
export default function ObserveHubPage() {
  return <ObserveHubClient />;
}
