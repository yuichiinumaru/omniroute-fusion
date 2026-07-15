import { redirect } from "next/navigation";

export const metadata = {
  title: "Compression",
  description: "Configure context compression settings to reduce token usage and costs.",
};

export default function CompressionPage() {
  // Task 0058: Compression hub entry points at Context Settings (not a mode page).
  redirect("/dashboard/context/settings");
}
