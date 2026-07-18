import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";

export async function POST(request: Request) {
  // ALWAYS_PROTECTED dual-layer: never honor requireLogin=false (Task 0040 N2).
  const authError = await requireManagementAuth(request, { always: true });
  if (authError) return authError;

  // Graceful restart: SIGTERM flows through the shutdown handler before the process manager restarts
  setTimeout(() => {
    process.kill(process.pid, "SIGTERM");
  }, 500);

  return NextResponse.json({ status: "restarting" });
}
