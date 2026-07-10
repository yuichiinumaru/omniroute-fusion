import { redirect } from "next/navigation";
import { buildObserveHubPath } from "@/shared/constants/observeHub";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/** Dual-nav retired (Epic 0005 S4) — request stream lives on Observe hub. */
export default async function LogsRedirectPage({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const params = searchParams ? await searchParams : {};
  const id = first(params.id) ?? first(params.request);
  const connection = first(params.connection);
  redirect(
    buildObserveHubPath("request", {
      id: id ?? undefined,
      connection: connection ?? undefined,
    })
  );
}
