import { redirect } from "next/navigation";
import { buildProvidersPricingPath } from "@/shared/constants/epic19Rebalance";

/**
 * Legacy costs pricing URL → Providers pricing (EPIC-19 T19-B / 0079).
 * Canonical: `buildProvidersPricingPath()`.
 */
export default function CostsPricingRedirectPage() {
  redirect(buildProvidersPricingPath());
}
