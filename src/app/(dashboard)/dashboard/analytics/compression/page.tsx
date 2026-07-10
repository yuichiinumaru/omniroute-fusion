import { redirect } from "next/navigation";

/** Dual-nav retired (Epic 0005 S2) — keep deep link via ?tab= */
export default function AnalyticsCompressionPage() {
  redirect("/dashboard/analytics?tab=compression");
}
