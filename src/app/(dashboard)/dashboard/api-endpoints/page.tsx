import { redirect } from "next/navigation";
import { CONNECT_CATALOG_SSOT_HREF } from "@/shared/constants/sidebarVisibility";

/**
 * Connect SSoT (Task 0024) + EPIC-20 T20-C / Task 0088.
 * Retired list path → catalog SSoT (now Operations Endpoint fusion).
 * Deep link preserved: never dual hardcoded catalog string.
 */
export default function ApiEndpointsPage() {
  redirect(CONNECT_CATALOG_SSOT_HREF);
}
