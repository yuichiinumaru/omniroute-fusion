import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Translator lab URL → Operations Labs peer (EPIC-20 T20-K / Task 0096).
 * Matrix: `/dashboard/translator` → `buildOperationsPath("labs")`.
 * Archive-not-delete: redirect shell; client remains for Labs composition.
 */
export default function LegacyTranslatorRedirectPage() {
  redirect(buildOperationsPath("labs"));
}
