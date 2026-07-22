import { redirect } from "next/navigation";
import { buildOperationsPath } from "@/shared/constants/epic20Operations";

type EndpointPageProps = {
  searchParams: Promise<{ tab?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

/**
 * EPIC-20 T20-C / Task 0088 — Endpoint dual-home retired.
 * Legacy tabs → Operations builders (0086). MCP/A2A intermediate homes stay
 * on `/dashboard/mcp` + `/dashboard/a2a` until 0089 / 0092 cut over.
 * Archive-not-delete: EndpointPageClient is imported by fusion only.
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
  if (tab === "context-sources" || tab === "context") {
    redirect(buildOperationsPath("integrations"));
  }

  // apis | catalog | openapi | api-endpoints | default → Endpoint fusion
  redirect(buildOperationsPath("endpoints"));
}
