import { NextResponse } from "next/server";
import {
  getActiveSessions,
  getActiveSessionCount,
  getAllActiveSessionCountsByKey,
} from "@omniroute/open-sse/services/sessionManager.ts";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";

/**
 * GET /api/sessions
 * Security (Task 0049 stretch / F-07-W2-006 + path-to-100 N3): always require
 * management auth (`{ always: true }`) so open-install (`requireLogin=false`)
 * cannot expose the live session map anonymously.
 */
export async function GET(request: Request) {
  const authError = await requireManagementAuth(request, { always: true });
  if (authError) return authError;

  try {
    const sessions = getActiveSessions();
    const count = getActiveSessionCount();
    const byApiKey = getAllActiveSessionCountsByKey();
    return NextResponse.json({ count, sessions, byApiKey });
  } catch (error) {
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}
