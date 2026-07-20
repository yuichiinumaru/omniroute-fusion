import { NextResponse } from "next/server";
import { getTailscaleTunnelStatus, startTailscaleDaemon } from "@/lib/tailscaleTunnel";
import { parseOptionalJsonBody, requireTailscaleAuth, tailscaleSudoSchema } from "../routeUtils";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authError = await requireTailscaleAuth(request);
  if (authError) return authError;

  const parsed = await parseOptionalJsonBody(request, tailscaleSudoSchema);
  if ("response" in parsed) return parsed.response;

  try {
    await startTailscaleDaemon(parsed.data);
    return NextResponse.json({
      success: true,
      status: await getTailscaleTunnelStatus(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          sanitizeErrorMessage(
            error instanceof Error ? error.message : "Failed to start the Tailscale daemon"
          ) || "Failed to start the Tailscale daemon",
      },
      { status: 500 }
    );
  }
}
