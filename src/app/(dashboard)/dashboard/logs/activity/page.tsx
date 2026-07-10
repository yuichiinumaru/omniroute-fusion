import { permanentRedirect } from "next/navigation";
import { buildObserveHubPath } from "@/shared/constants/observeHub";

/** Legacy activity path — Observe hub default source. */
export default function LogsActivityRedirect() {
  permanentRedirect(buildObserveHubPath("activity"));
}
