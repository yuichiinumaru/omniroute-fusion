import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

/**
 * Legacy Playground lab URL → Operations Labs peer (EPIC-20 T20-K / Task 0096).
 * Matrix: `/dashboard/playground` → `buildOperationsPath("labs")`.
 * Preserves `?tab=chat|compare|api|build` deep-link for PlaygroundStudio.
 */

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function LegacyPlaygroundRedirectPage({
  searchParams,
}: {
  searchParams?:
    | Promise<Record<string, string | string[] | undefined>>
    | Record<string, string | string[] | undefined>;
}) {
  const sp = searchParams instanceof Promise ? await searchParams : searchParams;
  const tab = firstQueryValue(sp?.tab);
  const base = buildOperationsPath("labs");
  if (tab === "chat" || tab === "compare" || tab === "api" || tab === "build") {
    redirect(`${base}?tab=${encodeURIComponent(tab)}`);
  }
  redirect(base);
}
