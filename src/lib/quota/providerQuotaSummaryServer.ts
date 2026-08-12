import { getProviderConnections } from "@/lib/db/providers";
import { getAllProviderLimitsCache } from "@/lib/db/providerLimits";
import { aggregateProviderQuotaSummary } from "./providerQuotaSummary";
import type { ProviderQuotaSummaryResponse } from "@/shared/contracts/quota";

if (typeof window !== "undefined") {
  throw new Error("providerQuotaSummaryServer can only be used on the server");
}

export async function getProviderQuotaSummary(
  options: { maxProviders?: number } = {}
): Promise<ProviderQuotaSummaryResponse> {
  try {
    const connections = await getProviderConnections();
    const limitsCache = getAllProviderLimitsCache();
    return aggregateProviderQuotaSummary(connections, limitsCache, {}, options);
  } catch (err) {
    console.error("[QuotaSummary] Failed to aggregate provider quota summary:", err);
    return {
      providers: [],
      meta: {
        generatedAt: new Date().toISOString(),
        totalActiveConnections: 0,
        totalProviders: 0,
        cappedAt: options.maxProviders ?? 6,
      },
    };
  }
}
