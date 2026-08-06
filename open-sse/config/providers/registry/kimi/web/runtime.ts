export interface KimiWebModelConfig {
  id: string;
  name: string;
  supportsReasoning?: boolean;
  maxTokens?: number;
}

export const KIMI_WEB_MODELS: Record<string, KimiWebModelConfig> = {
  k3: {
    id: "k3",
    name: "Kimi k3",
    supportsReasoning: true,
    maxTokens: 131072,
  },
  k2d6: {
    id: "k2d6",
    name: "Kimi k2d6",
    supportsReasoning: true,
    maxTokens: 131072,
  },
};

export function resolveKimiModelId(modelId: string): KimiWebModelConfig {
  const normalized = (modelId || "").toLowerCase().trim();
  if (normalized.includes("k2d6")) return KIMI_WEB_MODELS.k2d6;
  return KIMI_WEB_MODELS.k3;
}
