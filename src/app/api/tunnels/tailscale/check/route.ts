import { NextResponse } from "next/server";
import { getTailscaleCheckStatus } from "@/lib/tailscaleTunnel";
import { requireTailscaleAuth } from "../routeUtils";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await requireTailscaleAuth(request);
  if (authError) return authError;

  try {
    const status = await getTailscaleCheckStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          sanitizeErrorMessage(
            error instanceof Error ? error.message : "Failed to check Tailscale state"
          ) || "Failed to check Tailscale state",
      },
      { status: 500 }
    );
  }
}
