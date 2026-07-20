import { NextResponse } from "next/server";
import { getTailscaleTunnelStatus } from "@/lib/tailscaleTunnel";
import { requireTailscaleAuth } from "./routeUtils";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authError = await requireTailscaleAuth(request);
  if (authError) return authError;

  try {
    const status = await getTailscaleTunnelStatus();
    return NextResponse.json(status);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          sanitizeErrorMessage(
            error instanceof Error ? error.message : "Failed to load Tailscale status"
          ) || "Failed to load Tailscale status",
      },
      { status: 500 }
    );
  }
}
