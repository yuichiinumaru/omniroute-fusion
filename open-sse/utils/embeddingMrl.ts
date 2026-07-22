/**
 * Client-side Matryoshka / MRL prefix-truncate fallback (EPIC-21 T21-D / Task 0104).
 *
 * Pure helpers — no I/O. After a successful upstream embed, when the client
 * requested `dimensions: d` and the model is MRL-capable with vector length
 * `N ≥ d`, OmniRoute may prefix-truncate to `d` and L2-renormalize per
 * `EMBEDDING_MRL_CLIENT_RENORM_DEFAULT` (D4 lock from Task 0103).
 *
 * Non-MRL models must never be silently truncated.
 */

import {
  EMBEDDING_MRL_CLIENT_RENORM_DEFAULT,
  isAllowedEmbeddingDim,
  type EmbeddingModel,
} from "../config/embeddingRegistry.ts";

/** Structured log / metric event name for client MRL truncate (no secrets). */
export const EMBED_MRL_CLIENT_TRUNCATE_EVENT = "embed.mrl_client_truncate" as const;

export type MrlDimValidation =
  | { ok: true }
  | { ok: false; message: string };

export type MrlApplyResult =
  | {
      ok: true;
      data: unknown;
      truncated: boolean;
      fromDim?: number;
      toDim?: number;
      count?: number;
      renorm?: boolean;
    }
  | { ok: false; status: 400; message: string };

/**
 * Parse a client `dimensions` field into a positive integer, or null when
 * absent / not a finite number we can act on.
 */
export function parseRequestedEmbeddingDim(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

/**
 * Fail-closed pre-upstream check for known MRL models: requested dim must be
 * in allowlist / min–max (via `isAllowedEmbeddingDim`). Unknown models and
 * non-MRL rows do not reject here (provider-native path).
 */
export function validateRequestedMrlDim(
  model: EmbeddingModel | null | undefined,
  requestedDim: number | null
): MrlDimValidation {
  if (requestedDim === null) return { ok: true };
  if (!model || model.isMatryoshka !== true) return { ok: true };
  if (!isAllowedEmbeddingDim(model, requestedDim)) {
    return {
      ok: false,
      message:
        `Unsupported embedding dimensions: ${requestedDim} is not allowed for this Matryoshka model. ` +
        `Use a value in the model's supported dimension range or allowlist.`,
    };
  }
  return { ok: true };
}

/**
 * L2-normalize a float vector. Zero / non-finite norms return a copy unchanged.
 */
export function l2Normalize(vector: readonly number[]): number[] {
  let sumSq = 0;
  for (let i = 0; i < vector.length; i++) {
    const x = vector[i];
    sumSq += x * x;
  }
  const norm = Math.sqrt(sumSq);
  if (!Number.isFinite(norm) || norm === 0) {
    return vector.slice();
  }
  const out = new Array<number>(vector.length);
  for (let i = 0; i < vector.length; i++) {
    out[i] = vector[i] / norm;
  }
  return out;
}

/**
 * Prefix-truncate to `dim` and optionally L2-renormalize.
 * Caller must ensure `vector.length >= dim` and `dim > 0`.
 */
export function prefixTruncateAndMaybeRenorm(
  vector: readonly number[],
  dim: number,
  renorm: boolean = EMBEDDING_MRL_CLIENT_RENORM_DEFAULT
): number[] {
  const truncated = vector.length === dim ? vector.slice() : vector.slice(0, dim);
  return renorm ? l2Normalize(truncated) : truncated;
}

function isFloatEmbeddingArray(value: unknown): value is number[] {
  if (!Array.isArray(value) || value.length === 0) return false;
  // Sample first element only — full scan is O(n) on large vectors; handlers
  // already trust provider float arrays. Reject obvious base64/string payloads.
  return typeof value[0] === "number" && Number.isFinite(value[0]);
}

function embeddingItems(dataField: unknown): unknown[] | null {
  if (!Array.isArray(dataField)) return null;
  return dataField;
}

/**
 * Apply client MRL truncate+renorm to an OpenAI-style embeddings response
 * `data` array (mutates a shallow-cloned item list; does not mutate original
 * embedding arrays in place — returns new object graph for `data`).
 *
 * Rules:
 * - No requested dim → no-op
 * - MRL + unsupported d → reject 400 (re-validates allowlist; fail-closed)
 * - MRL + float vector length N > d → prefix truncate (+ renorm default on)
 * - MRL + N === d → no-op (identity)
 * - MRL + N < d → no-op pass-through (cannot pad)
 * - Known non-MRL + length !== d → reject 400 (never silent truncate)
 * - Unknown model (null) + mismatch → pass-through
 * - Non-float embeddings (e.g. base64) → skip item; no silent corrupt
 */
export function applyClientMrlToEmbeddingData(args: {
  dataField: unknown;
  model: EmbeddingModel | null | undefined;
  requestedDim: number | null;
  renorm?: boolean;
}): MrlApplyResult {
  const {
    dataField,
    model,
    requestedDim,
    renorm = EMBEDDING_MRL_CLIENT_RENORM_DEFAULT,
  } = args;

  if (requestedDim === null) {
    return { ok: true, data: dataField, truncated: false };
  }

  // Defense-in-depth: refuse unsupported MRL dims even if the caller skipped
  // the pre-upstream `validateRequestedMrlDim` gate (never silent-wrong-cut).
  const dimCheck = validateRequestedMrlDim(model, requestedDim);
  if (!dimCheck.ok) {
    return { ok: false, status: 400, message: dimCheck.message };
  }

  const items = embeddingItems(dataField);
  if (!items) {
    return { ok: true, data: dataField, truncated: false };
  }

  const isMrl = model != null && model.isMatryoshka === true;
  const knownNonMrl = model != null && model.isMatryoshka !== true;

  let truncated = false;
  let fromDim: number | undefined;
  let toDim: number | undefined;
  let count = 0;

  const nextItems: unknown[] = new Array(items.length);

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      nextItems[i] = item;
      continue;
    }

    // item is a non-null plain object (array branch excluded above).
    // Use Reflect.get / Object.assign to avoid `as Record` assertions.
    const emb = Reflect.get(item, "embedding");

    if (!isFloatEmbeddingArray(emb)) {
      nextItems[i] = item;
      continue;
    }

    const n = emb.length;

    if (n === requestedDim) {
      nextItems[i] = item;
      continue;
    }

    if (isMrl && n > requestedDim) {
      const shortened = prefixTruncateAndMaybeRenorm(emb, requestedDim, renorm);
      nextItems[i] = Object.assign({}, item, { embedding: shortened });
      truncated = true;
      // Report the largest observed source dim when batches differ (unusual).
      fromDim = fromDim === undefined ? n : Math.max(fromDim, n);
      toDim = requestedDim;
      count += 1;
      continue;
    }

    if (isMrl && n < requestedDim) {
      // Cannot pad; leave provider vector as-is.
      nextItems[i] = item;
      continue;
    }

    if (knownNonMrl) {
      return {
        ok: false,
        status: 400,
        message:
          `Embedding dimension mismatch: requested ${requestedDim}, upstream returned ${n}. ` +
          `Client-side Matryoshka truncation is not available for this non-MRL model.`,
      };
    }

    // Unknown model or non-actionable mismatch — pass through.
    nextItems[i] = item;
  }

  return {
    ok: true,
    data: nextItems,
    truncated,
    fromDim,
    toDim,
    count: truncated ? count : 0,
    renorm: truncated ? renorm : undefined,
  };
}
