import { redirect } from "next/navigation";
import { CONNECT_CATALOG_SSOT_HREF } from "@/shared/constants/sidebarVisibility";

/**
 * Connect SSoT (Epic 0005 S5) — OpenAPI catalog lives under the endpoint shell.
 * Deep link preserved: retired path → CONNECT_CATALOG_SSOT_HREF (never dual string).
 */
export default function ApiEndpointsPage() {
  redirect(CONNECT_CATALOG_SSOT_HREF);
}
