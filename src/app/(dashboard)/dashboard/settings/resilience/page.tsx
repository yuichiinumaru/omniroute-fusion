import { redirect } from "next/navigation";
import { buildSettingsPath } from "@/shared/constants/settingsHub";

export default function SettingsResiliencePage() {
  redirect(buildSettingsPath("routing"));
}
