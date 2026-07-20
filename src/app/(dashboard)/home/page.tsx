import { redirect } from "next/navigation";
import { getMachineId } from "@/shared/utils/machine";
import { getSettings } from "@/lib/localDb";
import BootstrapBanner from "../dashboard/BootstrapBanner";
import AutoRoutingBanner from "@/shared/components/AutoRoutingBanner";
import DashboardTopbar from "./DashboardTopbar";
import DashboardStoryHubClient from "./DashboardStoryHubClient";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();
  if (!settings.setupComplete) {
    redirect("/dashboard/onboarding");
  }
  const machineId = await getMachineId();
  const isBootstrapped = process.env.OMNIROUTE_BOOTSTRAPPED === "true";
  return (
    <>
      {/* Exactly one DashboardTopbar strip (story + peer hubs). */}
      <DashboardTopbar />
      {isBootstrapped && <BootstrapBanner />}
      <AutoRoutingBanner />
      <DashboardStoryHubClient machineId={machineId} />
    </>
  );
}
