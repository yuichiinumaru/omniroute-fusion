import { redirect } from "next/navigation";
import { buildObserveTrafficInspectorPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Traffic Inspector path → Observe peer (EPIC-20 T20-M / Task 0098).
 * Canonical: `/dashboard/activity?panel=traffic` (`EPIC20_TRAFFIC_INSPECTOR_PATH`).
 * Client + capture UI remains under this directory for co-location; only the route
 * entry redirects. APIs stay at `/api/tools/traffic-inspector/**` (local-only).
 */
export default function TrafficInspectorRedirectPage() {
  redirect(buildObserveTrafficInspectorPath());
}
