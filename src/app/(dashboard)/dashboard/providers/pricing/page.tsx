"use client";

import PricingTab from "../../settings/components/PricingTab";
import ProvidersTopBar from "../components/ProvidersTopBar";
import { PROVIDERS_PRICING_PATH } from "@/shared/constants/epic19Rebalance";

/**
 * Canonical Providers pricing surface (EPIC-19 / 0078 `buildProvidersPricingPath`).
 * Legacy `/dashboard/costs/pricing` and `/dashboard/settings/pricing` redirect here.
 *
 * Chrome: single `ProvidersTopBar` peer active on Pricing (0079 rework — no
 * secondary ProvidersPolicySubnav / CostsSubnav strip).
 */
export default function ProvidersPricingPage() {
  return (
    <div className="flex flex-col gap-6">
      <ProvidersTopBar currentPath={PROVIDERS_PRICING_PATH} />
      <PricingTab />
    </div>
  );
}
