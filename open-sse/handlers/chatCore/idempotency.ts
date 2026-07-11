import { getIdempotencyKey, checkIdempotency } from "@/lib/idempotencyLayer";
import { calculateCost } from "@/lib/usage/costCalculator";
import { attachOmniRouteMetaHeaders } from "@/domain/omnirouteResponseMeta";

/**
 * Resolve the request's idempotency key once and check the idempotency store. Returns the
 * resolved `idempotencyKey` alongside the cache `hit` so the caller can reuse the SAME key
 * for the later save path instead of re-deriving it — eliminating the dual-derivation that
 * the chatCore modularization (#3598) introduced. (#3821-review LEDGER-6)
 *
 * F-06-W2-002: keys are scoped by apiKeyId (principal) so tenants cannot share caches.
 */
export async function checkIdempotencyCache({
  clientRawRequest,
  provider,
  model,
  effectiveServiceTier,
  startTime,
  log,
  apiKeyId,
}: {
  clientRawRequest: unknown;
  provider: string;
  model: string;
  effectiveServiceTier: unknown;
  startTime: number;
  log: unknown;
  apiKeyId?: string | null;
}): Promise<{
  hit: { success: true; response: Response } | null;
  idempotencyKey: string | null;
}> {
  const headers =
    clientRawRequest && typeof clientRawRequest === "object" && "headers" in clientRawRequest
      ? (clientRawRequest as { headers?: unknown }).headers
      : undefined;
  const idempotencyKey = getIdempotencyKey(headers, apiKeyId ?? null);
  const cachedIdemp = checkIdempotency(idempotencyKey);
  if (cachedIdemp) {
    log?.debug?.("IDEMPOTENCY", `Hit for key=${idempotencyKey?.slice(0, 12)}...`);
    const idempotentUsage =
      cachedIdemp.response && typeof cachedIdemp.response === "object"
        ? ((cachedIdemp.response as Record<string, unknown>).usage as
            | Record<string, unknown>
            | undefined)
        : undefined;
    const idempotentCost = idempotentUsage
      ? await calculateCost(provider, model, idempotentUsage as Record<string, number>, {
          serviceTier: effectiveServiceTier,
        })
      : 0;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-OmniRoute-Idempotent": "true",
    };
    attachOmniRouteMetaHeaders(headers, {
      provider,
      model,
      cacheHit: false,
      latencyMs: Date.now() - startTime,
      usage: idempotentUsage,
      costUsd: idempotentCost,
    });
    return {
      idempotencyKey,
      hit: {
        success: true,
        response: new Response(JSON.stringify(cachedIdemp.response), {
          status: cachedIdemp.status,
          headers,
        }),
      },
    };
  }
  return { hit: null, idempotencyKey };
}
