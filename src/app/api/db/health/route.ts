import { NextResponse } from "next/server";
import { runManagedDbHealthCheck } from "@/lib/db/core";
import { isAuthenticated } from "@/shared/utils/apiAuth";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: { message: "Authentication required" } }, { status: 401 });
  }

  try {
    return NextResponse.json(runManagedDbHealthCheck({ autoRepair: false }));
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    console.error("[API] DB health diagnosis failed:", raw);
    const message = sanitizeErrorMessage(raw) || "DB health diagnosis failed";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: { message: "Authentication required" } }, { status: 401 });
  }

  try {
    return NextResponse.json(runManagedDbHealthCheck({ autoRepair: true }));
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    console.error("[API] DB health repair failed:", raw);
    const message = sanitizeErrorMessage(raw) || "DB health repair failed";
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
