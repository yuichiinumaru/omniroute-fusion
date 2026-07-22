import { redirect } from "next/navigation";
import { TESTING_HUB_CANONICAL_PATH } from "@/shared/constants/testingHub";

/**
 * Testing hub — **retired** (EPIC-20 / Task 0099 / T20-N).
 * Launchpad absorbed into Operations → Labs. Archive-not-delete redirect shell.
 * Matrix: `/dashboard/testing` → `TESTING_HUB_CANONICAL_PATH` (`/operations/labs`).
 */
export default function TestingHubRedirectPage() {
  redirect(TESTING_HUB_CANONICAL_PATH);
}
