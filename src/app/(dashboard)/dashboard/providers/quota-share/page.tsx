import ProvidersTopBar from "../components/ProvidersTopBar";
import QuotaSharePageClient from "../../costs/quota-share/QuotaSharePageClient";
import { PROVIDERS_QUOTA_SHARE_PATH } from "@/shared/constants/epic19Rebalance";

export const dynamic = "force-dynamic";

/**
 * Canonical Providers quota-share surface (EPIC-19 / 0078 `buildProvidersQuotaSharePath`).
 * Re-homes existing quota-share client tree (archive-not-delete under costs/).
 * Legacy `/dashboard/costs/quota-share` redirects here.
 *
 * Chrome: single `ProvidersTopBar` peer active on Quota Sharing (0079 rework — no
 * secondary ProvidersPolicySubnav / CostsSubnav strip).
 */
export default function ProvidersQuotaSharePage() {
  return (
    <div className="flex flex-col gap-6">
      <ProvidersTopBar currentPath={PROVIDERS_QUOTA_SHARE_PATH} />
      <QuotaSharePageClient />
    </div>
  );
}
