import { redirect } from "next/navigation";
import { buildObserveHubPath } from "@/shared/constants/observeHub";

/** Dual-nav retired (Epic 0005 S4) — keep deep link via ?source=a2a */
export default function AuditA2aRedirectPage() {
  redirect(buildObserveHubPath("a2a"));
}
