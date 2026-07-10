import { redirect } from "next/navigation";
import { buildObserveHubPath } from "@/shared/constants/observeHub";

/** Legacy usage URL → Observe request stream. */
export default function UsageRedirectPage() {
  redirect(buildObserveHubPath("request"));
}
