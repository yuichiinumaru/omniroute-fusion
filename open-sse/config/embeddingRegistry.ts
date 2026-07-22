/**
 * Embedding Provider Registry
 *
 * Defines providers that support the /v1/embeddings endpoint.
 * All providers use the OpenAI-compatible format.
 *
 * API keys are stored in the same provider credentials system,
 * keyed by provider ID (e.g. "nebius", "openai").
 *
 * Matryoshka / MRL metadata (EPIC-21 T21-C / Task 0103):
 * `dimensions` remains the preferred/native default size. Optional MRL fields
 * (`isMatryoshka`, allowlist/range, `matryoshkaMode`) are additive curation for
 * catalog exposure (0105) and client prefix-truncate fallback (0104).
 */

/**
 * How variable output dimensions are expected to be produced.
 * - provider: upstream honors OpenAI `dimensions` (or dialect-mapped field)
 * - client_truncate: OmniRoute may prefix-truncate post-upstream (0104)
 * - none: not MRL-safe; do not shorten
 */
export type MatryoshkaMode = "provider" | "client_truncate" | "none";

/**
 * EPIC-21 D4 / Task 0103 lock for **0104** client MRL fallback:
 * After prefix-truncating a returned vector to the requested dim, apply
 * **L2 renormalization by default** (parity with OpenAI guidance to normalize
 * after shortening). Operators may flip off only with explicit rationale.
 */
export const EMBEDDING_MRL_CLIENT_RENORM_DEFAULT = true as const;

/**
 * Gemini embedding family (gemini-embedding-001 / gemini-embedding-2).
 * Public docs: flexible output 128–3072 (default 3072); recommended 768 / 1536 / 3072.
 * Registry `dimensions: 768` is a **preferred default**, not full capability.
 * Sources: https://ai.google.dev/gemini-api/docs/embeddings · DeepMind Gemini Embedding 2
 *
 * Factory (not a shared object) so each model row gets a fresh allowlist array —
 * avoids cross-row mutation if a consumer ever mutates `matryoshkaDimensions`.
 */
function geminiEmbeddingMrl(): Pick<
  EmbeddingModel,
  | "isMatryoshka"
  | "matryoshkaMode"
  | "minDimensions"
  | "maxDimensions"
  | "matryoshkaDimensions"
> {
  return {
    isMatryoshka: true,
    matryoshkaMode: "provider",
    minDimensions: 128,
    maxDimensions: 3072,
    // Recommended quality points (Google); continuous range is min–max above.
    matryoshkaDimensions: [768, 1536, 3072],
  };
}

/**
 * OpenAI text-embedding-3-* (not ada-002).
 * MRL via API `dimensions` parameter; any positive integer ≤ native is accepted.
 * Native: small=1536, large=3072. Common documented cut points listed in allowlist.
 * Source: https://openai.com/index/new-embedding-models-and-api-updates/
 */
function openaiEmbedding3Mrl(nativeDim: number): Pick<
  EmbeddingModel,
  | "isMatryoshka"
  | "matryoshkaMode"
  | "minDimensions"
  | "maxDimensions"
  | "matryoshkaDimensions"
> {
  const common =
    nativeDim >= 3072
      ? [256, 512, 1024, 1536, 3072]
      : [256, 512, 1024, 1536].filter((d) => d <= nativeDim);
  return {
    isMatryoshka: true,
    matryoshkaMode: "provider",
    minDimensions: 1,
    maxDimensions: nativeDim,
    matryoshkaDimensions: common,
  };
}

/**
 * Qwen3-Embedding family (0.6B / 4B / 8B). Official tables mark MRL Support = Yes.
 * Native dims: 0.6B→1024, 4B→2560, 8B→4096. Variable dims up to native.
 * Sources: https://huggingface.co/Qwen/Qwen3-Embedding-8B · QwenLM/Qwen3-Embedding
 */
function qwen3EmbeddingMrl(nativeDim: number): Pick<
  EmbeddingModel,
  | "isMatryoshka"
  | "matryoshkaMode"
  | "minDimensions"
  | "maxDimensions"
  | "matryoshkaDimensions"
> {
  // Conservative curated cut points ≤ native (not a full invented continuum).
  const candidates = [32, 64, 128, 256, 512, 768, 1024, 1536, 2048, 2560, 3072, 4096];
  return {
    isMatryoshka: true,
    matryoshkaMode: "provider",
    minDimensions: 32,
    maxDimensions: nativeDim,
    matryoshkaDimensions: candidates.filter((d) => d <= nativeDim),
  };
}

export interface EmbeddingModel {
  id: string;
  name: string;
  /**
   * Preferred / native default vector length for this model.
   * For MRL models this is the full-size output when `dimensions` is omitted —
   * not necessarily the only legal size (see matryoshka* fields).
   */
  dimensions?: number;
  /**
   * Model-level default request parameters injected into the upstream body when
   * the client did not already supply them. Used for asymmetric embedding models
   * that require a mandatory parameter — e.g. NVIDIA NIM `nv-embedqa-*` models
   * reject requests without `input_type` ("query" | "passage"). See issue #1378.
   */
  defaultParams?: Record<string, unknown>;
  /**
   * True when the model is trained with Matryoshka Representation Learning so
   * prefix truncation / variable dims are geometrically valid.
   * Unset or false → non-MRL; 0104 must not client-truncate.
   */
  isMatryoshka?: boolean;
  /**
   * Discrete allowed output dimensions (curated public cut points).
   * When both this and min/max exist, either membership in the list **or**
   * the continuous range may authorize a dim (see `isAllowedEmbeddingDim`).
   * Prefer treating as read-only at call sites (do not mutate shared rows).
   */
  matryoshkaDimensions?: readonly number[];
  /** Inclusive lower bound when a continuous MRL range is documented. */
  minDimensions?: number;
  /** Inclusive upper bound (usually native max dim). */
  maxDimensions?: number;
  /**
   * Preferred path for variable dims. Client truncate (0104) still requires
   * `isMatryoshka === true` and an allowed dim; mode documents intent.
   */
  matryoshkaMode?: MatryoshkaMode;
}

export interface EmbeddingProvider {
  id: string;
  baseUrl: string;
  authType: string;
  authHeader: string;
  models: EmbeddingModel[];
}

export interface EmbeddingProviderNodeRow {
  id?: string;
  prefix: string;
  name: string;
  baseUrl: string;
  apiType?: string;
}

/**
 * Build a dynamic EmbeddingProvider from a local provider_node.
 * Only used for local providers (localhost) — caller must filter by hostname.
 */
export function buildDynamicEmbeddingProvider(node: EmbeddingProviderNodeRow): EmbeddingProvider {
  if (!node.prefix || !node.baseUrl) {
    throw new Error(`Invalid provider_node: missing prefix or baseUrl`);
  }
  if (node.prefix.includes("/") || node.prefix.includes(" ")) {
    throw new Error(`Invalid provider_node prefix "${node.prefix}": must not contain / or spaces`);
  }
  const baseUrl = node.baseUrl.replace(/\/+$/, "");
  return {
    id: node.prefix,
    baseUrl: `${baseUrl}/embeddings`,
    authType: "none",
    authHeader: "none",
    models: [],
  };
}

export const EMBEDDING_PROVIDERS: Record<string, EmbeddingProvider> = {
  cohere: {
    id: "cohere",
    baseUrl: "https://api.cohere.com/v2/embed",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      { id: "embed-v4.0", name: "Embed v4.0" },
      { id: "embed-multilingual-v3.0", name: "Embed Multilingual v3.0" },
      { id: "embed-multilingual-v3.0-images", name: "Embed Multilingual v3.0 Image" },
      { id: "embed-multilingual-light-v3.0", name: "Embed Multilingual Light v3.0" },
      { id: "embed-multilingual-light-v3.0-images", name: "Embed Multilingual Light v3.0 Image" },
    ],
  },

  nebius: {
    id: "nebius",
    baseUrl: "https://api.tokenfactory.nebius.com/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      {
        id: "Qwen/Qwen3-Embedding-8B",
        name: "Qwen3 Embedding 8B",
        dimensions: 4096,
        ...qwen3EmbeddingMrl(4096),
      },
    ],
  },

  openai: {
    id: "openai",
    baseUrl: "https://api.openai.com/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      {
        id: "text-embedding-3-small",
        name: "Text Embedding 3 Small",
        dimensions: 1536,
        ...openaiEmbedding3Mrl(1536),
      },
      {
        id: "text-embedding-3-large",
        name: "Text Embedding 3 Large",
        dimensions: 3072,
        ...openaiEmbedding3Mrl(3072),
      },
      // ada-002 is NOT MRL — fixed 1536; do not mark isMatryoshka.
      { id: "text-embedding-ada-002", name: "Text Embedding Ada 002", dimensions: 1536 },
    ],
  },

  upstage: {
    id: "upstage",
    baseUrl: "https://api.upstage.ai/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      { id: "embedding-query", name: "Embedding Query", dimensions: 4096 },
      { id: "embedding-passage", name: "Embedding Passage", dimensions: 4096 },
    ],
  },

  mistral: {
    id: "mistral",
    baseUrl: "https://api.mistral.ai/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [{ id: "mistral-embed", name: "Mistral Embed", dimensions: 1024 }],
  },

  together: {
    id: "together",
    baseUrl: "https://api.together.xyz/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      { id: "BAAI/bge-large-en-v1.5", name: "BGE Large EN v1.5", dimensions: 1024 },
      { id: "togethercomputer/m2-bert-80M-8k-retrieval", name: "M2 BERT 80M 8K", dimensions: 768 },
    ],
  },

  fireworks: {
    id: "fireworks",
    baseUrl: "https://api.fireworks.ai/inference/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      { id: "nomic-ai/nomic-embed-text-v1.5", name: "Nomic Embed Text v1.5", dimensions: 768 },
      {
        id: "accounts/fireworks/models/qwen3-embedding-8b",
        name: "Qwen3 Embedding 8B",
        dimensions: 4096,
        ...qwen3EmbeddingMrl(4096),
      },
    ],
  },

  nvidia: {
    id: "nvidia",
    baseUrl: "https://integrate.api.nvidia.com/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    // nv-embedqa-* are asymmetric models: NVIDIA NIM rejects requests without an
    // `input_type` ("query" | "passage") with 400 "'input_type' parameter is
    // required". Default to "query" when the client omits it (issue #1378).
    models: [
      {
        id: "nvidia/nv-embedqa-e5-v5",
        name: "NV EmbedQA E5 v5",
        dimensions: 1024,
        defaultParams: { input_type: "query" },
      },
    ],
  },

  // Issue #2298: Adding DeepInfra to the embedding registry so custom
  // embedding models on the DeepInfra provider don't fail with "Unknown
  // embedding provider" when the user adds them via the dashboard.
  deepinfra: {
    id: "deepinfra",
    baseUrl: "https://api.deepinfra.com/v1/openai/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      {
        id: "Qwen/Qwen3-Embedding-8B",
        name: "Qwen3 Embedding 8B",
        dimensions: 4096,
        ...qwen3EmbeddingMrl(4096),
      },
      {
        id: "Qwen/Qwen3-Embedding-4B",
        name: "Qwen3 Embedding 4B",
        dimensions: 2560,
        ...qwen3EmbeddingMrl(2560),
      },
      {
        id: "Qwen/Qwen3-Embedding-0.6B",
        name: "Qwen3 Embedding 0.6B",
        dimensions: 1024,
        ...qwen3EmbeddingMrl(1024),
      },
      { id: "BAAI/bge-large-en-v1.5", name: "BGE Large EN v1.5", dimensions: 1024 },
      { id: "BAAI/bge-base-en-v1.5", name: "BGE Base EN v1.5", dimensions: 768 },
      { id: "BAAI/bge-m3", name: "BGE-M3", dimensions: 1024 },
      { id: "intfloat/e5-large-v2", name: "E5 Large v2", dimensions: 1024 },
      { id: "thenlper/gte-large", name: "GTE Large", dimensions: 1024 },
    ],
  },

  openrouter: {
    id: "openrouter",
    baseUrl: "https://openrouter.ai/api/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      {
        id: "openai/text-embedding-3-small",
        name: "Text Embedding 3 Small (OpenRouter)",
        dimensions: 1536,
        ...openaiEmbedding3Mrl(1536),
      },
      {
        id: "openai/text-embedding-3-large",
        name: "Text Embedding 3 Large (OpenRouter)",
        dimensions: 3072,
        ...openaiEmbedding3Mrl(3072),
      },
      {
        id: "openai/text-embedding-ada-002",
        name: "Text Embedding Ada 002 (OpenRouter)",
        dimensions: 1536,
      },
    ],
  },

  gemini: {
    id: "gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      // dimensions: 768 = preferred default (Google recommends 768/1536/3072; API default is 3072).
      {
        id: "gemini-embedding-2",
        name: "Gemini Embedding 2",
        dimensions: 768,
        ...geminiEmbeddingMrl(),
      },
      {
        id: "gemini-embedding-001",
        name: "Gemini Embedding 001",
        dimensions: 768,
        ...geminiEmbeddingMrl(),
      },
    ],
  },

  "voyage-ai": {
    id: "voyage-ai",
    baseUrl: "https://api.voyageai.com/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      { id: "voyage-4-large", name: "Voyage 4 Large", dimensions: 1024 },
      { id: "voyage-4", name: "Voyage 4", dimensions: 1024 },
      { id: "voyage-4-lite", name: "Voyage 4 Lite", dimensions: 1024 },
      { id: "voyage-3-large", name: "Voyage 3 Large", dimensions: 1024 },
      { id: "voyage-multilingual-3.5", name: "Voyage Multilingual 3.5", dimensions: 1024 },
      { id: "voyage-code-3", name: "Voyage Code 3", dimensions: 1024 },
      { id: "voyage-code-2", name: "Voyage Code 2", dimensions: 1536 },
      { id: "voyage-finance-2", name: "Voyage Finance 2", dimensions: 1024 },
      { id: "voyage-law-2", name: "Voyage Law 2", dimensions: 1024 },
    ],
  },

  github: {
    id: "github",
    baseUrl: "https://models.inference.ai.azure.com/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      {
        id: "text-embedding-3-small",
        name: "Text Embedding 3 Small (GitHub)",
        dimensions: 1536,
        ...openaiEmbedding3Mrl(1536),
      },
      {
        id: "text-embedding-3-large",
        name: "Text Embedding 3 Large (GitHub)",
        dimensions: 3072,
        ...openaiEmbedding3Mrl(3072),
      },
    ],
  },

  "jina-ai": {
    id: "jina-ai",
    baseUrl: "https://api.jina.ai/v1/embeddings",
    authType: "apikey",
    authHeader: "bearer",
    models: [
      {
        id: "jina-embeddings-v5-text-small",
        name: "Jina Embeddings v5 Text Small",
        dimensions: 1024,
      },
      { id: "jina-embeddings-v5-text-nano", name: "Jina Embeddings v5 Text Nano", dimensions: 768 },
      { id: "jina-code-embeddings-1.5b", name: "Jina Code Embeddings 1.5B", dimensions: 1536 },
      { id: "jina-code-embeddings-0.5b", name: "Jina Code Embeddings 0.5B", dimensions: 896 },
      { id: "jina-embeddings-v4", name: "Jina Embeddings v4", dimensions: 2048 },
      { id: "jina-clip-v2", name: "Jina CLIP v2", dimensions: 1024 },
      { id: "jina-colbert-v2", name: "Jina ColBERT v2", dimensions: 128 },
    ],
  },
};

const EMBEDDING_PROVIDER_ALIASES: Record<string, string> = {
  jina: "jina-ai",
  voyage: "voyage-ai",
};

function resolveEmbeddingProviderId(providerId: string): string {
  return EMBEDDING_PROVIDER_ALIASES[providerId] || providerId;
}

function normalizeProviderScopedModelId(providerId: string, modelId: string): string {
  const resolvedProvider = resolveEmbeddingProviderId(providerId);
  const provider = EMBEDDING_PROVIDERS[resolvedProvider];
  if (provider?.models.some((model) => model.id === modelId)) return modelId;

  const providerScopedModelId = `${resolvedProvider}/${modelId}`;
  if (provider?.models.some((model) => model.id === providerScopedModelId)) {
    return providerScopedModelId;
  }

  return modelId.startsWith(`${providerId}/`) ? modelId.slice(providerId.length + 1) : modelId;
}

function toProviderScopedModelId(providerId: string, modelId: string): string {
  return modelId.startsWith(`${providerId}/`) ? modelId : `${providerId}/${modelId}`;
}

/**
 * Get embedding provider config by ID
 */
export function getEmbeddingProvider(providerId: string): EmbeddingProvider | null {
  return EMBEDDING_PROVIDERS[resolveEmbeddingProviderId(providerId)] || null;
}

/**
 * Parse embedding model string (format: "provider/model" or just "model")
 * Returns { provider, model }
 */
export function parseEmbeddingModel(
  modelStr: string | null,
  dynamicProviders?: EmbeddingProvider[]
): { provider: string | null; model: string | null } {
  if (!modelStr) return { provider: null, model: null };

  // Check for "provider/model" format
  const slashIdx = modelStr.indexOf("/");
  if (slashIdx > 0) {
    const rawProvider = modelStr.slice(0, slashIdx);
    const resolvedProvider = resolveEmbeddingProviderId(rawProvider);

    if (EMBEDDING_PROVIDERS[resolvedProvider]) {
      return {
        provider: resolvedProvider,
        model: normalizeProviderScopedModelId(resolvedProvider, modelStr.slice(slashIdx + 1)),
      };
    }

    // Phase 1: Try each hardcoded provider prefix
    for (const [providerId] of Object.entries(EMBEDDING_PROVIDERS)) {
      if (modelStr.startsWith(providerId + "/")) {
        return {
          provider: providerId,
          model: normalizeProviderScopedModelId(providerId, modelStr.slice(providerId.length + 1)),
        };
      }
    }
    // Phase 2: Try dynamic provider_nodes prefix
    if (dynamicProviders) {
      for (const dp of dynamicProviders) {
        if (modelStr.startsWith(dp.id + "/")) {
          return { provider: dp.id, model: modelStr.slice(dp.id.length + 1) };
        }
      }
    }
    // Phase 3: Fallback — first segment is provider
    const provider = modelStr.slice(0, slashIdx);
    const model = modelStr.slice(slashIdx + 1);
    return { provider, model };
  }

  // No provider prefix — search hardcoded providers for the model
  for (const [providerId, config] of Object.entries(EMBEDDING_PROVIDERS)) {
    if (config.models.some((m) => m.id === modelStr)) {
      return { provider: providerId, model: modelStr };
    }
  }

  return { provider: null, model: modelStr };
}

/**
 * Resolve the known vector dimension of an embedding model string
 * (format: "provider/model"). Returns undefined when the provider/model is
 * unknown or the registry has no dimension recorded for it (e.g. local/custom
 * providers) — callers treat undefined as "can't assert", not "zero".
 */
export function getEmbeddingDimension(modelStr: string): number | undefined {
  return getEmbeddingModelEntry(modelStr)?.dimensions;
}

/**
 * Look up the full `EmbeddingModel` row for `providerId` + model id
 * (raw or provider-scoped). Returns null when unknown.
 */
export function getEmbeddingModel(
  providerId: string,
  modelId: string
): EmbeddingModel | null {
  const config = getEmbeddingProvider(providerId);
  if (!config || !modelId) return null;
  const normalized = normalizeProviderScopedModelId(providerId, modelId);
  return config.models.find((m) => m.id === normalized || m.id === modelId) ?? null;
}

/**
 * Resolve registry row from a `provider/model` (or bare model) string.
 */
export function getEmbeddingModelEntry(modelStr: string): EmbeddingModel | null {
  const { provider, model } = parseEmbeddingModel(modelStr);
  if (!provider || !model) return null;
  return getEmbeddingModel(provider, model);
}

/**
 * True when the registry marks the model as Matryoshka / MRL-capable.
 */
export function isMatryoshkaModel(providerId: string, modelId: string): boolean {
  return getEmbeddingModel(providerId, modelId)?.isMatryoshka === true;
}

/**
 * Whether `dim` is an allowed output size for an MRL model row.
 *
 * Authorization (fail-closed for non-MRL and incomplete metadata):
 * 1. `isMatryoshka` must be true.
 * 2. If `matryoshkaDimensions` is non-empty and contains `dim` → allow.
 * 3. Else if **both** min and max are set and `min ≤ dim ≤ max` → allow.
 * 4. Else if only one of min/max is set, pair it with native `dimensions` as the
 *    missing bound (never open-ended).
 * 5. Else if only native `dimensions` equals `dim` → allow as identity.
 * 6. Otherwise → reject (incomplete range without native identity is not authorized).
 *
 * Used by 0104 (client truncate) and 0105 (catalog validation).
 */
export function isAllowedEmbeddingDim(model: EmbeddingModel, dim: number): boolean {
  if (!model.isMatryoshka) return false;
  if (!Number.isFinite(dim) || dim <= 0 || !Number.isInteger(dim)) return false;

  const allowlist = model.matryoshkaDimensions;
  if (Array.isArray(allowlist) && allowlist.length > 0 && allowlist.includes(dim)) {
    return true;
  }

  const min = model.minDimensions;
  const max = model.maxDimensions;
  const native = model.dimensions;
  const hasMin = typeof min === "number";
  const hasMax = typeof max === "number";
  const hasNative = typeof native === "number";

  if (hasMin && hasMax) {
    return dim >= min && dim <= max;
  }
  // Incomplete continuous range: require native as the missing end (fail-closed).
  if (hasMin && hasNative) {
    return dim >= min && dim <= native;
  }
  if (hasMax && hasNative) {
    return dim >= 1 && dim <= max;
  }

  // Fall back to native identity only (no open-ended min-only / max-only ranges).
  return hasNative && native === dim;
}

/**
 * Detect whether a set of embedding model strings spans more than one known
 * vector dimension. Vectors from models of different dimensions live in
 * incompatible spaces, so failing over between them silently corrupts any
 * vector store built on top of the proxy. Models with an *unknown* dimension
 * are ignored (conservative: we never flag a conflict we can't prove).
 */
export function detectEmbeddingDimensionConflict(modelStrs: string[]): {
  conflict: boolean;
  dimensions: Record<string, number>;
  distinct: number[];
} {
  const dimensions: Record<string, number> = {};
  for (const modelStr of modelStrs) {
    const dim = getEmbeddingDimension(modelStr);
    if (typeof dim === "number") dimensions[modelStr] = dim;
  }
  const distinct = [...new Set(Object.values(dimensions))].sort((a, b) => a - b);
  return { conflict: distinct.length > 1, dimensions, distinct };
}

/**
 * Resolve the model-level default request params for a given provider config and
 * model id. Returns undefined when the model has no defaults (the common case),
 * so callers only inject for models that actually carry one (e.g. NVIDIA NIM
 * asymmetric embedders requiring `input_type`). See issue #1378.
 */
export function getEmbeddingModelDefaultParams(
  providerConfig: EmbeddingProvider | null,
  modelId: string | null
): Record<string, unknown> | undefined {
  if (!providerConfig || !modelId) return undefined;
  return providerConfig.models.find((m) => m.id === modelId)?.defaultParams;
}

/**
 * Public Matryoshka / MRL capability fields for list + catalog JSON
 * (EPIC-21 T21-E / Task 0105).
 *
 * Stable camelCase names aligned with `EmbeddingModel` registry fields.
 * Non-MRL rows return `{}` so operators never see false-positive capabilities.
 * Allowlist arrays are copied so callers cannot mutate shared seed rows.
 */
export type EmbeddingModelPublicMrlFields = {
  isMatryoshka?: true;
  /** Copied allowlist (not shared with seed rows). Treat as read-only. */
  matryoshkaDimensions?: readonly number[];
  minDimensions?: number;
  maxDimensions?: number;
  matryoshkaMode?: MatryoshkaMode;
};

/**
 * Map registry MRL metadata → public list/catalog fields.
 * Only emits capability keys when `isMatryoshka === true`.
 */
export function toEmbeddingModelPublicMrlFields(
  model: Pick<
    EmbeddingModel,
    | "isMatryoshka"
    | "matryoshkaDimensions"
    | "minDimensions"
    | "maxDimensions"
    | "matryoshkaMode"
  >
): EmbeddingModelPublicMrlFields {
  if (model.isMatryoshka !== true) {
    return {};
  }
  const out: EmbeddingModelPublicMrlFields = { isMatryoshka: true };
  if (model.matryoshkaMode) {
    out.matryoshkaMode = model.matryoshkaMode;
  }
  if (typeof model.minDimensions === "number") {
    out.minDimensions = model.minDimensions;
  }
  if (typeof model.maxDimensions === "number") {
    out.maxDimensions = model.maxDimensions;
  }
  if (Array.isArray(model.matryoshkaDimensions) && model.matryoshkaDimensions.length > 0) {
    out.matryoshkaDimensions = [...model.matryoshkaDimensions];
  }
  return out;
}

/** Flat list row returned by `getAllEmbeddingModels` (provider-scoped id + MRL). */
export type FlatEmbeddingModelListEntry = {
  id: string;
  name: string;
  provider: string;
  dimensions: number | undefined;
} & EmbeddingModelPublicMrlFields;

/**
 * Get all embedding models as a flat list (includes MRL capability fields for 0105).
 */
export function getAllEmbeddingModels(): FlatEmbeddingModelListEntry[] {
  const models: FlatEmbeddingModelListEntry[] = [];
  for (const [providerId, config] of Object.entries(EMBEDDING_PROVIDERS)) {
    for (const model of config.models) {
      models.push({
        id: toProviderScopedModelId(providerId, model.id),
        name: model.name,
        provider: providerId,
        dimensions: model.dimensions,
        ...toEmbeddingModelPublicMrlFields(model),
      });
    }
  }
  return models;
}
