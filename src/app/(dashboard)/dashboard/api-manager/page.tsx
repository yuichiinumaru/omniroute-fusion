import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * EPIC-20 T20-C / Task 0088 — API Keys live in Endpoint fusion stack.
 * Archive-not-delete: redirect shell; client remains imported by fusion.
 */
export default function ApiManagerPage() {
  redirect(buildOperationsPath("endpoints"));
}
