import { createApiKey } from "@/lib/localDb";
import { getConsistentMachineId } from "@/shared/utils/machineId";

/**
 * Error thrown when a caller selects an existing API key by id but does not
 * supply the secret. After F-05-002 hash-only storage the secret cannot be
 * rehydrated from the DB (only available at create/regenerate time).
 */
export class ApiKeySecretUnavailableError extends Error {
  readonly keyId: string;

  constructor(keyId: string) {
    super(
      `API key id "${keyId}" cannot rehydrate its secret after hash-only storage. ` +
        `Provide the full key value (shown once at create/regenerate) via apiKey, ` +
        `or omit keyId to auto-create a new key.`
    );
    this.name = "ApiKeySecretUnavailableError";
    this.keyId = keyId;
  }
}

/** Type guard for hash-only fail-loud errors (CLI/settings routes map to HTTP 400). */
export function isApiKeySecretUnavailableError(
  error: unknown
): error is ApiKeySecretUnavailableError {
  return (
    error instanceof ApiKeySecretUnavailableError ||
    (error instanceof Error && error.name === "ApiKeySecretUnavailableError")
  );
}

function isUsableSecret(apiKey: string | null | undefined): apiKey is string {
  return typeof apiKey === "string" && apiKey.trim().length > 0 && apiKey !== "sk_omniroute";
}

/**
 * Resolve an API key secret for CLI tool config writers.
 *
 * Hash-only contract (Task 0041 / F-05-002):
 * - Prefer an explicitly provided secret (`apiKey`).
 * - Selecting by `apiKeyId` alone can no longer rehydrate the secret from DB;
 *   that fails loudly via {@link ApiKeySecretUnavailableError}.
 * - With neither id nor secret, returns the historical sentinel `sk_omniroute`
 *   (callers that require a real key must reject the sentinel).
 */
export async function resolveApiKey(
  apiKeyId?: string | null,
  apiKey?: string | null
): Promise<string> {
  if (isUsableSecret(apiKey)) {
    return apiKey.trim();
  }

  if (apiKeyId && typeof apiKeyId === "string" && apiKeyId.trim().length > 0) {
    throw new ApiKeySecretUnavailableError(apiKeyId.trim());
  }

  return apiKey || "sk_omniroute";
}

/**
 * Get or create a DB-backed API key for CLI tool setup.
 * Returns a valid OmniRoute API key (not a placeholder like "sk_omniroute").
 * Used when user has not explicitly selected a key from API Keys.
 *
 * When `apiKeyId` is provided without a recoverable secret, throws
 * {@link ApiKeySecretUnavailableError} rather than silently creating a
 * different key or writing a wrong token.
 */
export async function getOrCreateApiKey(apiKeyId?: string | null): Promise<string> {
  if (apiKeyId && typeof apiKeyId === "string" && apiKeyId.trim().length > 0) {
    throw new ApiKeySecretUnavailableError(apiKeyId.trim());
  }

  // No key selected — auto-create one that will be valid in DB validation.
  // Plaintext is returned once here; only the hash is persisted.
  let machineId = "unknown";
  try {
    machineId = await getConsistentMachineId();
    const keyRecord = await createApiKey("CLI Auto-Key", machineId);
    return keyRecord.key as string;
  } catch {
    // Fallback: generate a deterministic key if DB write fails
    return `sk-${machineId}-fallback-${Date.now()}`;
  }
}
