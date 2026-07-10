import { redirect } from "next/navigation";
import EndpointPageClient from "./EndpointPageClient";

type EndpointPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * Connect SSoT (Epic 0005 S5).
 * Legacy dual-nav tabs mcp/a2a redirect to single protocol homes.
 */
export default async function EndpointPage({ searchParams }: EndpointPageProps) {
  const params = await searchParams;
  const tab = firstParam(params.tab);

  if (tab === "mcp") {
    redirect("/dashboard/mcp");
  }
  if (tab === "a2a") {
    redirect("/dashboard/a2a");
  }

  return <EndpointPageClient machineId="" initialTab={tab ?? null} />;
}
