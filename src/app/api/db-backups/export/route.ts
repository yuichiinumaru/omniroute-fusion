import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import os from "os";
import { getDbInstance, SQLITE_FILE } from "@/lib/db/core";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";

/**
 * GET /api/db-backups/export — Download the current database as a .sqlite file.
 *
 * Uses SQLite's native backup API to create a consistent snapshot,
 * then streams it as a downloadable attachment.
 *
 * 🔒 ALWAYS_PROTECTED dual-layer: requireManagementAuth({ always: true }) so
 * open installs (requireLogin=false) cannot dump credentials (Task 0040 N2 / F-07-004).
 */
export async function GET(request: Request) {
  const authError = await requireManagementAuth(request, { always: true });
  if (authError) return authError;
  try {
    if (!SQLITE_FILE || !fs.existsSync(SQLITE_FILE)) {
      return NextResponse.json({ error: "Database file not found" }, { status: 404 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const exportFilename = `omniroute-backup-${timestamp}.sqlite`;
    const tmpDir = os.tmpdir();
    const tmpPath = path.join(tmpDir, exportFilename);

    // Use native SQLite backup API for a consistent snapshot
    const db = getDbInstance();
    await db.backup(tmpPath);

    const fileBuffer = fs.readFileSync(tmpPath);

    // Cleanup temp file
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      /* best effort */
    }

    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${exportFilename}"`,
        "Content-Length": String(fileBuffer.length),
        "Cache-Control": "no-cache, no-store",
      },
    });
  } catch (error) {
    console.error("[API] Error exporting database:", error);
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}
