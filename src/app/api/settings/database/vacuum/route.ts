import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/shared/utils/apiAuth";
import { runNow, getState } from "@/lib/db/vacuumScheduler";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delegate to the scheduler so the manual run also writes
    // lastRunAt / lastDurationMs to key_value, which the UI reads
    // via getDatabaseSettings().stats.lastVacuumAt. Using the old
    // runManualVacuum() from core.ts was the root cause of the
    // "vacuum never persists" bug (issue #4437).
    const result = await runNow();

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `VACUUM completed in ${result.durationMs}ms`,
        duration: result.durationMs,
      });
    } else if (result.error === "already_running") {
      return NextResponse.json(
        {
          success: false,
          error: "A vacuum is already in progress",
        },
        { status: 409 }
      );
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "VACUUM failed",
          duration: result.durationMs,
        },
        { status: 500 }
      );
    }
  } catch (error: unknown) {
    console.error("[API] VACUUM endpoint error:", error);
    // Hard Rule #12: sanitize details leaf (F-SEC-W2-004).
    const details = sanitizeErrorMessage(
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { error: "Failed to run VACUUM", details },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ state: getState() });
}
