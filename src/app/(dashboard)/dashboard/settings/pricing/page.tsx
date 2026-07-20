import { redirect } from "next/navigation";
import { buildProvidersPricingPath } from "@/shared/constants/epic19Rebalance";

/** Legacy settings pricing URL → Providers pricing (EPIC-19 T19-B / 0079). */
export default function SettingsPricingPage() {
  redirect(buildProvidersPricingPath());
}
