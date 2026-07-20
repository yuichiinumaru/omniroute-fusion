import { redirect } from "next/navigation";
import { buildDashboardStoryPath } from "@/shared/constants/epic19Rebalance";

/** Legacy nested analytics route → Dashboard storytelling (EPIC-19 / Task 0081). */
export default function AnalyticsSearchPage() {
  redirect(buildDashboardStoryPath("search"));
}
