import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { getProviderQuotaSummary } from "@/lib/quota/providerQuotaSummaryServer";
import { buildErrorBody } from "@omniroute/open-sse/utils/error.ts";

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const summary = await getProviderQuotaSummary({ maxProviders: 6 });
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[API] GET /api/providers/quota-summary error:", error);
    return NextResponse.json(
      buildErrorBody("Failed to fetch provider quota summary", "quota_summary_error", 500),
      { status: 500 }
    );
  }
}
