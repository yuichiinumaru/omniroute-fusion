import { redirect } from "next/navigation";

/** Dual-nav retired (Epic 0005 S2) — keep deep link via ?tab= */
export default function AnalyticsComboHealthPage() {
  redirect("/dashboard/analytics?tab=combo-health");
}
