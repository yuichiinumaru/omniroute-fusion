import { redirect } from "next/navigation";
import { buildSettingsPath } from "@/shared/constants/settingsHub";

export default function SettingsAiPage() {
  redirect(buildSettingsPath("routing"));
}
