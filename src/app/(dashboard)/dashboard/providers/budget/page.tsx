"use client";

import BudgetTab from "../../usage/components/BudgetTab";
import ProvidersTopBar from "../components/ProvidersTopBar";
import { PROVIDERS_BUDGET_PATH } from "@/shared/constants/epic19Rebalance";

/**
 * Canonical Providers budget surface (EPIC-19 / 0078 `buildProvidersBudgetPath`).
 * Legacy `/dashboard/costs/budget` redirects here.
 *
 * Chrome: single `ProvidersTopBar` peer active on Budget (0079 rework — no
 * secondary ProvidersPolicySubnav / CostsSubnav strip).
 */
export default function ProvidersBudgetPage() {
  return (
    <div className="flex flex-col gap-6">
      <ProvidersTopBar currentPath={PROVIDERS_BUDGET_PATH} />
      <BudgetTab />
    </div>
  );
}
