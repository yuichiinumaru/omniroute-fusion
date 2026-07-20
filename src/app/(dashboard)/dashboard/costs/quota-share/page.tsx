import { redirect } from "next/navigation";
import { buildProvidersQuotaSharePath } from "@/shared/constants/epic19Rebalance";

/**
 * Legacy costs quota-share URL → Providers quota-share (EPIC-19 T19-B / 0079).
 * Implementation tree remains under costs/quota-share/ (imported by Providers route).
 * Canonical: `buildProvidersQuotaSharePath()`.
 */
export default function CostsQuotaShareRedirectPage() {
  redirect(buildProvidersQuotaSharePath());
}
