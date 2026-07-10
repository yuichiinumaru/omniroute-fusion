import { redirect } from "next/navigation";

/** Dual-nav retired (Epic 0005 S2) — keep deep link via ?tab= */
export default function AnalyticsSearchPage() {
  redirect("/dashboard/analytics?tab=search");
}
