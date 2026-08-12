import { resolveProviderId } from "@/shared/constants/providers";
import { parseQuotaData } from "@/app/(dashboard)/dashboard/usage/components/ProviderLimits/quotaParsing";
import type {
  ProviderQuotaSummaryItem,
  ProviderQuotaSummaryResponse,
} from "@/shared/contracts/quota";

const KNOWN_PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  antigravity: "Antigravity",
  github: "GitHub Copilot",
  kiro: "Kiro AI",
  "amazon-q": "Amazon Q",
  codex: "OpenAI Codex",
  claude: "Claude Code",
  glm: "GLM (Z.AI)",
  zai: "Z.AI",
  glmt: "GLM Thinking",
  opencode: "OpenCode",
  "opencode-go": "OpenCode Go",
  "opencode-zen": "OpenCode Zen",
  "ollama-cloud": "Ollama Cloud",
  "kimi-coding": "Kimi Coding",
  minimax: "MiniMax",
  nanogpt: "NanoGPT",
  deepseek: "DeepSeek",
  openai: "OpenAI",
  gemini: "Google Gemini",
  groq: "Groq",
  xai: "xAI (Grok)",
  mistral: "Mistral AI",
  cohere: "Cohere",
  nvidia: "NVIDIA",
  cerebras: "Cerebras",
  qwen: "Qwen",
  cline: "Cline",
};

const CANONICAL_PROVIDER_MAP: Record<string, string> = {
  agy: "antigravity",
  glmt: "glm",
  "glm-cn": "glm",
  "minimax-cn": "minimax",
  "qwen-web": "qwen",
  "qwen-coding": "qwen",
  "opencode-zen": "opencode",
  cl: "cline",
  nv: "nvidia",
};

export function normalizeCanonicalProviderId(provider: string): string {
  const raw = (provider || "").trim().toLowerCase();
  if (CANONICAL_PROVIDER_MAP[raw]) return CANONICAL_PROVIDER_MAP[raw];
  const resolved = (resolveProviderId(raw) || raw).trim().toLowerCase();
  return CANONICAL_PROVIDER_MAP[resolved] || resolved || "unknown";
}

export function getProviderDisplayName(providerId: string): string {
  const normalized = normalizeCanonicalProviderId(providerId);
  if (KNOWN_PROVIDER_DISPLAY_NAMES[normalized]) return KNOWN_PROVIDER_DISPLAY_NAMES[normalized];
  return normalized
    .split(/[-_]+/)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : ""))
    .join(" ")
    .trim() || providerId;
}

function isConnectionActive(conn: any): boolean {
  if (!conn || typeof conn !== "object") return false;
  if (
    conn.isActive === false ||
    conn.is_active === 0 ||
    conn.isActive === 0 ||
    conn.is_active === false ||
    conn.status === "inactive" ||
    conn.status === "disabled"
  ) {
    return false;
  }
  return Boolean(conn.isActive ?? conn.is_active ?? true);
}

interface EvaluatedQuota {
  hasKnownQuota: boolean;
  percentRemaining: number | null;
  isExhausted: boolean;
  resetAt: string | null;
  fetchedAt: string | null;
}

function evaluateConnectionQuota(
  connId: string,
  canonicalProviderId: string,
  limitsCache: Record<string, any>,
  snapshotsMap: Record<string, any>
): EvaluatedQuota {
  const cacheEntry = limitsCache[connId];
  if (cacheEntry && typeof cacheEntry === "object") {
    const dataForParse = cacheEntry.quotas ? cacheEntry : { quotas: cacheEntry };
    const parsed = parseQuotaData(canonicalProviderId, dataForParse);
    if (Array.isArray(parsed) && parsed.length > 0) {
      const validPcts: number[] = [];
      let isExhausted = false;
      let earliestReset: string | null = null;

      for (const q of parsed) {
        if (!q || q.name === "error" || typeof q.message === "string") continue;

        const pct = typeof q.remainingPercentage === "number" ? q.remainingPercentage : null;
        if (pct !== null && Number.isFinite(pct)) {
          validPcts.push(Math.max(0, Math.min(100, pct)));
        }

        if (q.isExhausted || pct === 0) {
          isExhausted = true;
        }

        if (typeof q.resetAt === "string" && q.resetAt.trim()) {
          const resetIso = q.resetAt.trim();
          if (!earliestReset || resetIso < earliestReset) {
            earliestReset = resetIso;
          }
        }
      }

      if (validPcts.length > 0) {
        const minPct = Math.min(...validPcts);
        return {
          hasKnownQuota: true,
          percentRemaining: minPct,
          isExhausted: minPct === 0 || isExhausted,
          resetAt: earliestReset,
          fetchedAt: typeof cacheEntry.fetchedAt === "string" ? cacheEntry.fetchedAt : null,
        };
      }
    }
  }


  const snapshot = snapshotsMap[connId];
  if (snapshot) {
    const rawPct = snapshot.remaining_percentage ?? snapshot.remainingPercentage;
    if (typeof rawPct === "number" && Number.isFinite(rawPct)) {
      const clampedPct = Math.max(0, Math.min(100, rawPct));
      return {
        hasKnownQuota: true,
        percentRemaining: clampedPct,
        isExhausted: clampedPct === 0 || Boolean(snapshot.is_exhausted ?? snapshot.isExhausted),
        resetAt: null,
        fetchedAt: typeof snapshot.created_at === "string" ? snapshot.created_at : null,
      };
    }
  }

  return {
    hasKnownQuota: false,
    percentRemaining: null,
    isExhausted: false,
    resetAt: null,
    fetchedAt: null,
  };
}

export function aggregateProviderQuotaSummary(
  connections: any[],
  limitsCache: Record<string, any> = {},
  snapshotsMap: Record<string, any> = {},
  options: { maxProviders?: number } = {}
): ProviderQuotaSummaryResponse {
  const activeConns = (Array.isArray(connections) ? connections : []).filter(isConnectionActive);

  const groups = new Map<
    string,
    {
      providerId: string;
      providerName: string;
      activeAccountCount: number;
      knownPcts: number[];
      isExhaustedList: boolean[];
      resetAtList: string[];
      fetchedAtList: string[];
    }
  >();

  for (const conn of activeConns) {
    const rawProvider = typeof conn.provider === "string" ? conn.provider.trim() : "";
    const canonicalId = normalizeCanonicalProviderId(rawProvider);

    let group = groups.get(canonicalId);

    if (!group) {
      group = {
        providerId: canonicalId,
        providerName: getProviderDisplayName(canonicalId),
        activeAccountCount: 0,
        knownPcts: [],
        isExhaustedList: [],
        resetAtList: [],
        fetchedAtList: [],
      };
      groups.set(canonicalId, group);
    }
    group.activeAccountCount += 1;

    const quota = evaluateConnectionQuota(conn.id, canonicalId, limitsCache, snapshotsMap);
    if (quota.hasKnownQuota && quota.percentRemaining !== null) {
      group.knownPcts.push(quota.percentRemaining);
      group.isExhaustedList.push(quota.isExhausted);
      if (quota.resetAt) group.resetAtList.push(quota.resetAt);
      if (quota.fetchedAt) group.fetchedAtList.push(quota.fetchedAt);
    }
  }

  const items: ProviderQuotaSummaryItem[] = [];

  for (const group of groups.values()) {
    const hasKnownQuota = group.knownPcts.length > 0;
    let percentRemaining: number | null = null;
    let isExhausted = false;
    let resetAt: string | null = null;
    let fetchedAt: string | null = null;

    if (hasKnownQuota) {
      const sum = group.knownPcts.reduce((a, b) => a + b, 0);
      percentRemaining = Math.round((sum / group.knownPcts.length) * 10) / 10;
      isExhausted = group.isExhaustedList.every(Boolean) || percentRemaining === 0;

      if (group.resetAtList.length > 0) {
        resetAt = [...group.resetAtList].sort()[0];
      }
      if (group.fetchedAtList.length > 0) {
        fetchedAt = [...group.fetchedAtList].sort().reverse()[0];
      }
    }

    items.push({
      providerId: group.providerId,
      providerName: group.providerName,
      activeAccountCount: group.activeAccountCount,
      hasKnownQuota,
      percentRemaining,
      isExhausted,
      resetAt,
      fetchedAt,
    });
  }

  items.sort((a, b) => {
    if (b.activeAccountCount !== a.activeAccountCount) {
      return b.activeAccountCount - a.activeAccountCount;
    }
    if (b.hasKnownQuota !== a.hasKnownQuota) {
      return (b.hasKnownQuota ? 1 : 0) - (a.hasKnownQuota ? 1 : 0);
    }
    return a.providerId.localeCompare(b.providerId);
  });

  const cappedAt = options.maxProviders && options.maxProviders > 0 ? options.maxProviders : 6;
  const cappedProviders = items.slice(0, cappedAt);

  return {
    providers: cappedProviders,
    meta: {
      generatedAt: new Date().toISOString(),
      totalActiveConnections: activeConns.length,
      totalProviders: groups.size,
      cappedAt,
    },
  };
}
