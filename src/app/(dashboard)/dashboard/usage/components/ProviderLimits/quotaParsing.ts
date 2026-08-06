import { getModelsByProviderId } from "@omniroute/open-sse/config/providerModels.ts";
import { getAntigravityUiQuotaFamily } from "@omniroute/open-sse/services/antigravityQuotaFamily.ts";
import { safePercentage } from "@/shared/utils/formatting";

const GLM_QUOTA_ORDER: Record<string, number> = { session: 0, weekly: 1, mcp_monthly: 2 };

const ANTIGRAVITY_FAMILY_CONFIG: Record<
  "claude" | "gemini_3x" | "gemini_legacy",
  { name: string; displayName: string }
> = {
  claude: { name: "claude", displayName: "Claude" },
  gemini_3x: { name: "gemini_3x", displayName: "Gemini 3.x (Flash/Pro)" },
  gemini_legacy: { name: "gemini_legacy", displayName: "Gemini Legacy (2.x/Lite)" },
};

function formatModelLabel(name: string) {
  const trimmed = typeof name === "string" ? name.trim() : "";
  if (!trimmed) return "";
  return trimmed
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function groupAntigravityQuotas(quotas: any[]): any[] {
  if (!Array.isArray(quotas) || quotas.length === 0) return [];

  const familyMap = new Map<
    "claude" | "gemini_3x" | "gemini_legacy",
    {
      items: any[];
      staleAfterReset: boolean;
      sources: Set<string>;
      fractionReportedCount: number;
    }
  >();

  const remaining: any[] = [];

  for (const q of quotas) {
    if (!q) continue;
    if (q.isCredits || q.name === "credits") {
      remaining.push(q);
      continue;
    }

    const modelKey = q.modelKey || q.name;
    const uiFamily = getAntigravityUiQuotaFamily(modelKey);

    if (uiFamily === "claude" || uiFamily === "gemini_3x" || uiFamily === "gemini_legacy") {
      let entry = familyMap.get(uiFamily);
      if (!entry) {
        entry = {
          items: [],
          staleAfterReset: false,
          sources: new Set(),
          fractionReportedCount: 0,
        };
        familyMap.set(uiFamily, entry);
      }
      entry.items.push(q);
      if (q.staleAfterReset) entry.staleAfterReset = true;
      if (q.quotaSource) entry.sources.add(q.quotaSource);
      if (q.fractionReported || q.isPercentageOnly) entry.fractionReportedCount++;
    } else {
      remaining.push(q);
    }
  }

  const groupedFamilyBars: any[] = [];
  const familyOrder: Array<"claude" | "gemini_3x" | "gemini_legacy"> = [
    "claude",
    "gemini_3x",
    "gemini_legacy",
  ];

  for (const famKey of familyOrder) {
    const entry = familyMap.get(famKey);
    if (!entry || entry.items.length === 0) continue;

    const { items, staleAfterReset, sources, fractionReportedCount } = entry;
    const config = ANTIGRAVITY_FAMILY_CONFIG[famKey];

    let minPct = 100;
    let allUnlimited = true;
    const modelKeys: string[] = [];
    const tooltipParts: string[] = [];
    let soonestResetTime: number | null = null;
    let soonestResetIso: string | null = null;
    const now = Date.now();

    for (const q of items) {
      const modelId = q.modelKey || q.name;
      modelKeys.push(modelId);

      const pct = q.unlimited
        ? 100
        : Number(q.remainingPercentage ?? safePercentage(q.remainingPercentage) ?? 0);
      if (!q.unlimited) {
        allUnlimited = false;
        if (pct < minPct) minPct = pct;
      }

      const label = q.displayName || formatModelLabel(modelId || "");
      const pctStr = q.unlimited ? "∞" : `${Math.round(pct)}%`;
      tooltipParts.push(`${label}: ${pctStr}`);

      if (q.resetAt) {
        const ts = new Date(q.resetAt).getTime();
        if (Number.isFinite(ts) && ts > now) {
          if (soonestResetTime === null || ts < soonestResetTime) {
            soonestResetTime = ts;
            soonestResetIso = typeof q.resetAt === "string" ? q.resetAt : new Date(ts).toISOString();
          }
        }
      }
    }

    const quotaSource = sources.has("retrieveUserQuota")
      ? "retrieveUserQuota"
      : sources.has("fetchAvailableModels")
        ? "fetchAvailableModels"
        : undefined;

    groupedFamilyBars.push({
      name: config.name,
      displayName: config.displayName,
      familyKey: famKey,
      isFamilyBar: true,
      used: 0,
      total: allUnlimited ? 0 : 100,
      remainingPercentage: allUnlimited ? 100 : minPct,
      unlimited: allUnlimited,
      isPercentageOnly: true,
      fractionReported: fractionReportedCount > 0,
      resetAt: soonestResetIso,
      staleAfterReset,
      modelKeys,
      modelTooltip: tooltipParts.join(", "),
      ...(quotaSource ? { quotaSource } : {}),
    });
  }

  return [...groupedFamilyBars, ...remaining];
}

function quotaEntries(data: any): Array<[string, any]> {
  return data?.quotas && typeof data.quotas === "object" ? Object.entries(data.quotas) : [];
}

function isUnlimitedEmpty(quota: any): boolean {
  return Boolean(quota?.unlimited && (!quota?.total || quota.total <= 0));
}

function isPastResetWindow(resetAt: any): boolean {
  if (!resetAt) return false;
  const resetTime =
    typeof resetAt === "number" ? resetAt : typeof resetAt === "string" ? Date.parse(resetAt) : NaN;
  return Number.isFinite(resetTime) && Date.now() >= resetTime;
}

function getResetAdjustedQuota(quota: any) {
  const usedRaw = Number(quota?.used || 0);
  const totalRaw = Number(quota?.total || 0);
  const total = Number.isFinite(totalRaw) ? totalRaw : 0;
  const remainingRaw = safePercentage(quota?.remainingPercentage);
  const hasPendingUsage = usedRaw > 0 || (remainingRaw !== undefined && remainingRaw < 100);
  const staleAfterReset = isPastResetWindow(quota?.resetAt || null) && hasPendingUsage;

  return {
    staleAfterReset,
    total,
    used: staleAfterReset ? 0 : usedRaw,
    remainingPercentage: staleAfterReset && total > 0 ? 100 : remainingRaw,
  };
}

function normalizeQuotaEntry(name: string, quota: any = {}, extras: any = {}) {
  const adjusted = getResetAdjustedQuota(quota);
  return {
    name,
    used: Number.isFinite(adjusted.used) ? adjusted.used : 0,
    total: adjusted.total,
    resetAt: quota?.resetAt || null,
    staleAfterReset: adjusted.staleAfterReset,
    ...(adjusted.remainingPercentage !== undefined
      ? { remainingPercentage: adjusted.remainingPercentage }
      : {}),
    ...extras,
  };
}

function parseGeneric(data: any) {
  return quotaEntries(data).map(([name, quota]) => normalizeQuotaEntry(name, quota));
}

function parseGithub(data: any) {
  return quotaEntries(data)
    .filter(([, quota]) => !isUnlimitedEmpty(quota))
    .map(([name, quota]) => normalizeQuotaEntry(name, quota));
}

function parseGlmFamily(data: any) {
  return quotaEntries(data).map(([name, quota]) =>
    normalizeQuotaEntry(name, quota, {
      displayName: quota?.displayName,
      details: Array.isArray(quota?.details) ? quota.details : undefined,
      isPercentageOnly:
        Number(quota?.total || 0) === 100 && quota?.remainingPercentage !== undefined,
    })
  );
}

function buildCreditsQuota(
  name: string,
  remaining: number,
  remainingPercentage: number,
  extra = {}
) {
  return {
    name,
    used: 0,
    total: 0,
    remaining,
    resetAt: null,
    unlimited: false,
    isCredits: true,
    remainingPercentage,
    creditCount: remaining,
    ...extra,
  };
}

function parseAntigravityQuota(modelKey: string, quota: any) {
  if (modelKey === "credits") {
    const remaining = Number(quota?.remaining ?? 0);
    return buildCreditsQuota("credits", remaining, remaining > 50 ? 100 : remaining > 10 ? 60 : 20);
  }
  if (modelKey === "models" || isUnlimitedEmpty(quota)) return null;
  return normalizeQuotaEntry(modelKey, quota, {
    modelKey,
    isPercentageOnly: quota?.fractionReported === true,
    ...(quota?.quotaSource ? { quotaSource: quota.quotaSource } : {}),
    ...(quota?.fractionReported !== undefined ? { fractionReported: quota.fractionReported } : {}),
  });
}

function parseAntigravity(data: any) {
  const rawQuotas = quotaEntries(data)
    .map(([modelKey, quota]) => parseAntigravityQuota(modelKey, quota))
    .filter(Boolean);
  return groupAntigravityQuotas(rawQuotas);
}

function parseCodex(data: any) {
  return quotaEntries(data).map(([quotaType, quota]) =>
    normalizeQuotaEntry(quotaType, quota, {
      displayName: quota?.displayName,
      isPercentageOnly: true,
    })
  );
}

function parseClaude(data: any) {
  if (data?.message)
    return [{ name: "error", used: 0, total: 0, resetAt: null, message: data.message }];
  return quotaEntries(data).map(([name, quota]) =>
    normalizeQuotaEntry(name, quota, { isPercentageOnly: true })
  );
}

function parseDeepseekQuota(quotaKey: string, quota: any) {
  const match = quotaKey.match(/^credits(?:_([a-z]{3}))?$/);
  if (!match) return normalizeQuotaEntry(quotaKey, quota);
  const remaining = Number(quota?.remaining ?? 0);
  const currency = quota?.currency ?? (match[1] ? match[1].toUpperCase() : "USD");
  return buildCreditsQuota(currency, remaining, remaining > 20 ? 100 : remaining > 5 ? 60 : 20, {
    currency,
  });
}

function parseDeepseek(data: any) {
  return quotaEntries(data).map(([quotaKey, quota]) => parseDeepseekQuota(quotaKey, quota));
}

function parseProviderQuotas(providerId: string, data: any) {
  if (providerId === "github") return parseGithub(data);
  if (["glm", "glm-cn", "glmt", "opencode-go"].includes(providerId)) return parseGlmFamily(data);
  if (providerId === "antigravity" || providerId === "agy") return parseAntigravity(data);
  if (providerId === "codex") return parseCodex(data);
  if (providerId === "claude") return parseClaude(data);
  if (providerId === "deepseek") return parseDeepseek(data);
  return parseGeneric(data);
}

function sortProviderModelOrder(provider: string, quotas: any[]) {
  const modelOrder = getModelsByProviderId(provider);
  if (modelOrder.length === 0) return;
  const orderMap = new Map(modelOrder.map((m, i) => [m.id, i]));
  quotas.sort(
    (a, b) =>
      (orderMap.get(a.modelKey || a.name) ?? 999) - (orderMap.get(b.modelKey || b.name) ?? 999)
  );
}

function sortGlmOrder(providerId: string, quotas: any[]) {
  if (!["glm", "glm-cn", "glmt", "opencode-go"].includes(providerId)) return;
  quotas.sort((a, b) => (GLM_QUOTA_ORDER[a.name] ?? 99) - (GLM_QUOTA_ORDER[b.name] ?? 99));
}

export function parseQuotaData(provider: string | undefined, data: any) {
  if (!data || typeof data !== "object") return [];
  const providerId = String(provider || "").toLowerCase();

  try {
    const normalizedQuotas = parseProviderQuotas(providerId, data);
    sortProviderModelOrder(provider, normalizedQuotas);
    sortGlmOrder(providerId, normalizedQuotas);
    return normalizedQuotas;
  } catch (error) {
    console.error(`Error parsing quota data for ${provider}:`, error);
    return [];
  }
}
