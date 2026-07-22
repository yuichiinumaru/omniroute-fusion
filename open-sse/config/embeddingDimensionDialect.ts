/**
 * Embedding dimension dialect SSoT (EPIC-21 T21-B / Task 0102).
 *
 * Single source of truth for how client OpenAI `dimensions` map onto upstream
 * embedding request bodies per provider (+ optional baseUrl mode).
 *
 * Client contract remains OpenAI `dimensions` (D1). Upstream dialects:
 * - Default / OpenAI-compat: forward `dimensions`
 * - Gemini OpenAI-compat shim (`/v1beta/openai/embeddings`): `dimensions` only;
 *   strip `outputDimensionality` (Google rejects it on the shim)
 * - Gemini native embedContent (extension point only): map to
 *   `outputDimensionality` and strip OpenAI `dimensions` — not enabled on the
 *   current production registry baseUrl
 *
 * See: docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md
 */

export type DimensionParamName =
  | "dimensions"
  | "outputDimensionality"
  | "output_dimension"
  | null;

export type EmbeddingDimensionMode =
  | "openai-compat"
  | "gemini-openai-shim"
  | "gemini-native";

export interface EmbeddingDimensionDialect {
  /** Upstream field that receives the client dimensions value, or null to drop. */
  readonly dimensionParam: DimensionParamName;
  /** Fields that must not appear on the upstream body for this dialect. */
  readonly stripFields: readonly string[];
  /** Discriminator for logging / tests. */
  readonly mode: EmbeddingDimensionMode;
}

export interface ResolveEmbeddingDimensionDialectInput {
  readonly providerId: string;
  readonly baseUrl?: string | null;
}

/** Client-facing + native dimension keys owned exclusively by the dialect. */
export const DIMENSION_OWNED_FIELDS: readonly string[] = [
  "dimensions",
  "outputDimensionality",
  "output_dimension",
] as const;

const GEMINI_OPENAI_SHIM_MARKERS: readonly string[] = [
  "/openai/embeddings",
  "generativelanguage.googleapis.com/v1beta/openai",
] as const;

/**
 * True when `baseUrl` is Google's OpenAI-compatibility embeddings shim.
 * Production Gemini registry baseUrl matches this.
 */
export function isGeminiOpenAiShimBaseUrl(baseUrl: string | null | undefined): boolean {
  if (!baseUrl || typeof baseUrl !== "string") return false;
  const lower = baseUrl.toLowerCase();
  return GEMINI_OPENAI_SHIM_MARKERS.some((marker) => lower.includes(marker));
}

/**
 * True when `baseUrl` targets Gemini native embedContent (or non-OpenAI generative
 * language embeddings path). Conservatively excludes any OpenAI-shim URL so the
 * production registry baseUrl never selects native mode.
 *
 * Extension point only — not active for current EMBEDDING_PROVIDERS.gemini.baseUrl.
 */
export function isGeminiNativeBaseUrl(baseUrl: string | null | undefined): boolean {
  if (!baseUrl || typeof baseUrl !== "string") return false;
  if (isGeminiOpenAiShimBaseUrl(baseUrl)) return false;
  const lower = baseUrl.toLowerCase();
  if (lower.includes("embedcontent")) return true;
  // Non-OpenAI generativelanguage host (e.g. batchEmbedContents / models/*:embedContent)
  if (
    lower.includes("generativelanguage.googleapis.com") &&
    !lower.includes("/openai/")
  ) {
    return true;
  }
  return false;
}

const OPENAI_COMPAT_DIALECT: EmbeddingDimensionDialect = {
  mode: "openai-compat",
  dimensionParam: "dimensions",
  // Never leak Gemini-native field into strict OpenAI-compat APIs.
  stripFields: ["outputDimensionality"],
};

const GEMINI_OPENAI_SHIM_DIALECT: EmbeddingDimensionDialect = {
  mode: "gemini-openai-shim",
  dimensionParam: "dimensions",
  stripFields: ["outputDimensionality"],
};

const GEMINI_NATIVE_DIALECT: EmbeddingDimensionDialect = {
  mode: "gemini-native",
  dimensionParam: "outputDimensionality",
  stripFields: ["dimensions"],
};

/**
 * Resolve the dimension dialect for a provider (+ optional baseUrl mode).
 * Unknown providers default to OpenAI-compat `dimensions`.
 */
export function resolveEmbeddingDimensionDialect(
  input: ResolveEmbeddingDimensionDialectInput,
): EmbeddingDimensionDialect {
  const providerId = (input.providerId || "").toLowerCase();
  const baseUrl = input.baseUrl ?? null;

  if (providerId === "gemini") {
    // Native mode only when baseUrl explicitly looks like native embedContent.
    // Missing baseUrl → OpenAI-shim (matches production registry default).
    if (baseUrl && isGeminiNativeBaseUrl(baseUrl)) {
      return GEMINI_NATIVE_DIALECT;
    }
    return GEMINI_OPENAI_SHIM_DIALECT;
  }

  return OPENAI_COMPAT_DIALECT;
}

function omitKeys(
  source: Record<string, unknown>,
  keys: readonly string[],
): Record<string, unknown> {
  if (keys.length === 0) return { ...source };
  const skip = new Set(keys);
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (!skip.has(key)) {
      out[key] = value;
    }
  }
  return out;
}

export interface ApplyEmbeddingDimensionsInput {
  readonly providerId: string;
  readonly baseUrl?: string | null;
  /** Client OpenAI `dimensions` value (may be undefined). */
  readonly clientDimensions: unknown;
  /** Upstream body mid-build (model/input/extras already applied). */
  readonly upstreamBody: Record<string, unknown>;
}

/**
 * Apply the dialect to an upstream embedding body.
 *
 * - Strips dialect-forbidden fields (and other dimension-owned keys not used).
 * - Sets the dialect's `dimensionParam` from client `dimensions` when present.
 * - Does not invent dual-forward: one dialect → one param name (or drop).
 *
 * Returns a new object; does not mutate `upstreamBody`.
 */
export function applyEmbeddingDimensions(
  input: ApplyEmbeddingDimensionsInput,
): Record<string, unknown> {
  const dialect = resolveEmbeddingDimensionDialect({
    providerId: input.providerId,
    baseUrl: input.baseUrl,
  });

  // Drop all dimension-owned keys first; dialect re-applies the correct one.
  const cleaned = omitKeys(input.upstreamBody, DIMENSION_OWNED_FIELDS);

  // Extra safety: stripFields may grow beyond DIMENSION_OWNED_FIELDS later.
  const body = omitKeys(cleaned, dialect.stripFields);

  if (input.clientDimensions === undefined || input.clientDimensions === null) {
    return body;
  }

  const param = dialect.dimensionParam;
  if (param === null) {
    return body;
  }

  if (param === "dimensions") {
    // OpenAI-compat / Gemini OpenAI-shim: forward client value as-is (including 0).
    body.dimensions = input.clientDimensions;
    return body;
  }

  // Native / alternate param names require a positive finite number.
  const n = Number(input.clientDimensions);
  if (Number.isFinite(n) && n > 0) {
    body[param] = n;
  }
  return body;
}
