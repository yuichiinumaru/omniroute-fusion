import { NextResponse } from "next/server";
import { requireManagementAuth } from "@/lib/api/requireManagementAuth";
import { getApiKeys } from "@/lib/localDb";
import { maskStoredApiKey } from "@/lib/apiKeyExposure";

/**
 * GET /api/cli-tools/keys
 *
 * List API keys for the CLI tools UI.
 * Security (Task 0049 / F-07-W2-005 + Task 0041 hash-only):
 *   - LOCAL_ONLY + ALWAYS_PROTECTED (routeGuard) — remote tunnel cannot dump inventory
 *   - requireManagementAuth({ always: true }) — open installs still need a principal
 *   - Never returns bulk plaintext / rawKey (hash-only at rest; secrets only on create/regenerate)
 *   - `key` is a display mask from keyPrefix when available; never residual DB material
 */
export async function GET(request: Request) {
  const authError = await requireManagementAuth(request, { always: true });
  if (authError) return authError;

  try {
    const keys = await getApiKeys();
    const cliToolKeys = keys.map((key) => {
      const prefix =
        typeof (key as { keyPrefix?: unknown }).keyPrefix === "string"
          ? ((key as { keyPrefix: string }).keyPrefix as string)
          : null;
      const displaySource =
        prefix && prefix.length > 0
          ? prefix
          : typeof key.key === "string" && key.key.length > 0
            ? key.key
            : null;
      return {
        id: key.id,
        name: key.name,
        machineId: key.machineId,
        createdAt: key.createdAt,
        scopes: key.scopes,
        isActive: key.isActive,
        keyPrefix: prefix,
        // Masked display only — never bulk rawKey after hash-only (0041).
        key: displaySource ? maskStoredApiKey(displaySource.padEnd(12, "*")) : null,
      };
    });
    return NextResponse.json({ keys: cliToolKeys, total: cliToolKeys.length });
  } catch (error) {
    console.log("Error fetching CLI tool keys:", error);
    return NextResponse.json({ error: "Failed to fetch CLI tool keys" }, { status: 500 });
  }
}
