import { NextResponse } from "next/server";
import { getTaskManager } from "@/lib/a2a/taskManager";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const tm = getTaskManager();
    const task = tm.cancelTask(id);
    return NextResponse.json({ task: { id: task.id, state: task.state } });
  } catch (error) {
    const raw = error instanceof Error ? error.message : "Failed to cancel A2A task";
    const message = sanitizeErrorMessage(raw) || "Failed to cancel A2A task";
    const status = raw.includes("not found") ? 404 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
