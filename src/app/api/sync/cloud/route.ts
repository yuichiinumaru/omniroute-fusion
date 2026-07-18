import { NextResponse } from "next/server";
import { getApiKeys, createApiKey, updateSettings } from "@/lib/localDb";
import { getConsistentMachineId } from "@/shared/utils/machineId";
import { syncToCloud, fetchWithTimeout, CLOUD_URL } from "@/lib/cloudSync";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { cloudSyncActionSchema } from "@/shared/validation/schemas";
import { isValidationFailure, validateBody } from "@/shared/validation/helpers";
import { sanitizeErrorMessage } from "@omniroute/open-sse/utils/error";

/**
 * GET /api/sync/cloud
 * Returns current cloud sync status for sidebar indicator
 */
export async function GET() {
  try {
    const { isCloudEnabled } = await import("@/lib/db/settings");
    const enabled = await isCloudEnabled();

    if (!enabled) {
      return NextResponse.json({ enabled: false });
    }

    // Cloud is enabled. Hash-only storage (F-05-002) cannot rehydrate inventory
    // secrets for a live verify ping — do NOT mint keys on GET (status polls).
    // Connectivity is confirmed at enable-time; GET reports enabled + unknown probe.
    if (!CLOUD_URL) {
      return NextResponse.json({ enabled: true, connected: false });
    }
    return NextResponse.json({
      enabled: true,
      // null = probe unavailable without rehydratable secret (not a hard disconnect)
      connected: null,
      lastSync: null,
    });
  } catch (error: unknown) {
    return NextResponse.json({ enabled: false, error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}

/**
 * POST /api/sync/cloud
 * Sync data with Cloud
 */
export async function POST(request: any) {
  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } },
      { status: 400 }
    );
  }

  try {
    const validation = validateBody(cloudSyncActionSchema, rawBody);
    if (isValidationFailure(validation)) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }
    const { action } = validation.data;

    // Always get machineId from server, don't trust client
    const machineId = await getConsistentMachineId();

    switch (action) {
      case "enable": {
        // Hash-only (F-05-002): existing rows cannot rehydrate secrets. Always
        // mint a fresh key for enable+verify so cloud sync receives a real bearer.
        const keys = await getApiKeys();
        const createdKey =
          keys.length === 0
            ? await createApiKey("Default Key", machineId)
            : await createApiKey("Cloud Sync Key", machineId);
        // Sync first — only enable if sync succeeds
        const enableResult = await syncAndVerify(machineId, createdKey?.key, keys);
        const enableBody = await enableResult.clone().json().catch(() => ({}));
        // Only persist cloudEnabled if sync succeeded (body.success exists)
        if (enableBody.success) {
          await updateSettings({ cloudEnabled: true });
        }
        return enableResult;
      }
      case "sync": {
        const syncResult: any = await syncToCloud(machineId);
        if (syncResult.error) {
          return NextResponse.json(syncResult, { status: 502 });
        }
        return NextResponse.json(syncResult);
      }
      case "disable":
        await updateSettings({ cloudEnabled: false });
        return handleDisable(machineId, request);
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error: unknown) {
    console.log("Cloud sync error:", error);
    return NextResponse.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}

/**
 * Sync and verify connection with ping (retry on verify)
 */
async function syncAndVerify(machineId: string, createdKey: any, existingKeys: any[]) {
  // Step 1: Sync data to cloud
  const syncResult: any = await syncToCloud(machineId, createdKey);
  if (syncResult.error) {
    return NextResponse.json(
      { error: `Cloud sync failed: ${syncResult.error}` },
      { status: 502 }
    );
  }

  // Build the cloud URL for the frontend to use
  const cloudUrl = CLOUD_URL ? `${CLOUD_URL}/${machineId}` : null;

  // Step 2: Verify connection by pinging the cloud (with retry).
  // Prefer the just-created secret; inventory keys are hash-only (no rehydrate).
  const apiKey =
    typeof createdKey === "string" && createdKey.trim().length > 0 ? createdKey.trim() : null;
  if (!apiKey) {
    return NextResponse.json({
      ...syncResult,
      cloudUrl,
      verified: false,
      verifyError:
        "No API key secret available after hash-only storage — create/regenerate a key and retry enable",
    });
  }

  // Retry verify up to 2 times with a delay (cloud may need a moment after sync)
  const MAX_VERIFY_ATTEMPTS = 2;
  const VERIFY_RETRY_DELAY_MS = 1500;
  let lastVerifyError = null;

  for (let attempt = 1; attempt <= MAX_VERIFY_ATTEMPTS; attempt++) {
    try {
      const pingResponse = await fetchWithTimeout(
        `${CLOUD_URL}/${machineId}/v1/verify`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
        5000
      );

      if (pingResponse.ok) {
        return NextResponse.json({
          ...syncResult,
          cloudUrl,
          verified: true,
        });
      }
      lastVerifyError = `Ping failed: ${pingResponse.status}`;
    } catch (error: any) {
      lastVerifyError = error?.name === "AbortError" ? "Verify timeout" : error.message;
    }

    // Wait before retry (except on last attempt)
    if (attempt < MAX_VERIFY_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, VERIFY_RETRY_DELAY_MS));
    }
  }

  // Sync succeeded but verify failed — still return success with warning
  return NextResponse.json({
    ...syncResult,
    cloudUrl,
    verified: false,
    verifyError: lastVerifyError || "Verification failed after retries",
  });
}

/**
 * Disable Cloud - delete cache and update Claude CLI settings
 */
async function handleDisable(machineId: string, request: any) {
  if (!CLOUD_URL) {
    return NextResponse.json({ error: "NEXT_PUBLIC_CLOUD_URL is not configured" }, { status: 500 });
  }

  let response;
  try {
    response = await fetchWithTimeout(`${CLOUD_URL}/sync/${machineId}`, {
      method: "DELETE",
    });
  } catch (error: any) {
    const isTimeout = error?.name === "AbortError";
    return NextResponse.json(
      {
        error: isTimeout ? "Cloud disable timeout" : "Failed to reach cloud service",
      },
      { status: 502 }
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.log("Cloud disable failed:", errorText);
    return NextResponse.json({ error: "Failed to disable cloud" }, { status: 502 });
  }

  // Update Claude CLI settings to use local endpoint
  const host = request.headers.get("host") || "localhost:20128";
  await updateClaudeSettingsToLocal(machineId, host);

  return NextResponse.json({
    success: true,
    message: "Cloud disabled",
  });
}

/**
 * Update Claude CLI settings to use local endpoint (only if currently using cloud)
 */
async function updateClaudeSettingsToLocal(machineId: string, host: string) {
  try {
    const settingsPath = path.join(os.homedir(), ".claude", "settings.json");
    const cloudUrl = `${CLOUD_URL}/${machineId}`;
    const localUrl = `http://${host}`;

    // Read current settings
    let settings;
    try {
      const content = await fs.readFile(settingsPath, "utf-8");
      settings = JSON.parse(content);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return; // No settings file, nothing to update
      }
      throw error;
    }

    // Check if ANTHROPIC_BASE_URL matches cloud URL
    const currentUrl = settings.env?.ANTHROPIC_BASE_URL;
    if (!currentUrl || currentUrl !== cloudUrl) {
      return; // Not using cloud URL, don't modify
    }

    // Update to local URL
    settings.env.ANTHROPIC_BASE_URL = localUrl;
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2));
    console.log(`Updated Claude CLI settings: ${cloudUrl} → ${localUrl}`);
  } catch (error: any) {
    console.log("Failed to update Claude CLI settings:", error.message);
  }
}
