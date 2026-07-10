import { redirect } from "next/navigation";

/**
 * Connect SSoT (Epic 0005 S5) — OpenAPI catalog lives under the endpoint shell.
 * Deep link preserved: /dashboard/api-endpoints → /dashboard/endpoint?tab=catalog
 */
export default function ApiEndpointsPage() {
  redirect("/dashboard/endpoint?tab=catalog");
}
