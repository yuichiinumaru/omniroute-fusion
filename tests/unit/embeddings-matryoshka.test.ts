/**
 * EPIC-21 T21-C / Task 0103 — registry Matryoshka / MRL metadata seed + helpers.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  EMBEDDING_MRL_CLIENT_RENORM_DEFAULT,
  EMBEDDING_PROVIDERS,
  getEmbeddingModel,
  getEmbeddingModelEntry,
  isAllowedEmbeddingDim,
  isMatryoshkaModel,
  type EmbeddingModel,
} from "../../open-sse/config/embeddingRegistry.ts";

// ---------------------------------------------------------------------------
// D4 renorm policy lock (0104 consumes this constant)
// ---------------------------------------------------------------------------

test("EMBEDDING_MRL_CLIENT_RENORM_DEFAULT is true (D4 lock for 0104)", () => {
  assert.equal(EMBEDDING_MRL_CLIENT_RENORM_DEFAULT, true);
});

// ---------------------------------------------------------------------------
// Gemini seed set
// ---------------------------------------------------------------------------

test("gemini-embedding-2 and gemini-embedding-001 are MRL with 128–3072 range", () => {
  for (const id of ["gemini-embedding-2", "gemini-embedding-001"] as const) {
    const m = getEmbeddingModel("gemini", id);
    assert.ok(m, `missing gemini model ${id}`);
    assert.equal(m.isMatryoshka, true);
    assert.equal(m.matryoshkaMode, "provider");
    assert.equal(m.dimensions, 768); // preferred default (not full max)
    assert.equal(m.minDimensions, 128);
    assert.equal(m.maxDimensions, 3072);
    assert.ok(Array.isArray(m.matryoshkaDimensions) && m.matryoshkaDimensions.length > 0);
    assert.ok(m.matryoshkaDimensions!.includes(768));
    assert.ok(m.matryoshkaDimensions!.includes(1536));
    assert.ok(m.matryoshkaDimensions!.includes(3072));
    assert.equal(isAllowedEmbeddingDim(m, 768), true);
    assert.equal(isAllowedEmbeddingDim(m, 1024), true); // continuous range
    assert.equal(isAllowedEmbeddingDim(m, 64), false); // below min
    assert.equal(isAllowedEmbeddingDim(m, 4096), false); // above max
  }
});

// ---------------------------------------------------------------------------
// OpenAI text-embedding-3-* seed set
// ---------------------------------------------------------------------------

test("openai text-embedding-3-small/large are MRL; ada-002 is not", () => {
  const small = getEmbeddingModel("openai", "text-embedding-3-small");
  const large = getEmbeddingModel("openai", "text-embedding-3-large");
  const ada = getEmbeddingModel("openai", "text-embedding-ada-002");

  assert.ok(small && large && ada);
  assert.equal(small.isMatryoshka, true);
  assert.equal(large.isMatryoshka, true);
  assert.equal(small.matryoshkaMode, "provider");
  assert.equal(large.matryoshkaMode, "provider");
  assert.equal(small.dimensions, 1536);
  assert.equal(large.dimensions, 3072);
  assert.equal(small.maxDimensions, 1536);
  assert.equal(large.maxDimensions, 3072);
  assert.ok(small.matryoshkaDimensions!.includes(512));
  assert.ok(large.matryoshkaDimensions!.includes(256));

  // Non-MRL negative case
  assert.notEqual(ada.isMatryoshka, true);
  assert.equal(isMatryoshkaModel("openai", "text-embedding-ada-002"), false);
  assert.equal(isAllowedEmbeddingDim(ada, 512), false);
  assert.equal(isAllowedEmbeddingDim(ada, 1536), false);
});

test("openrouter and github mirror OpenAI-3 MRL flags", () => {
  const orSmall = getEmbeddingModel("openrouter", "openai/text-embedding-3-small");
  const orLarge = getEmbeddingModel("openrouter", "openai/text-embedding-3-large");
  const orAda = getEmbeddingModel("openrouter", "openai/text-embedding-ada-002");
  const ghSmall = getEmbeddingModel("github", "text-embedding-3-small");
  const ghLarge = getEmbeddingModel("github", "text-embedding-3-large");

  assert.ok(orSmall?.isMatryoshka);
  assert.ok(orLarge?.isMatryoshka);
  assert.notEqual(orAda?.isMatryoshka, true);
  assert.ok(ghSmall?.isMatryoshka);
  assert.ok(ghLarge?.isMatryoshka);
  assert.equal(ghLarge?.maxDimensions, 3072);
});

// ---------------------------------------------------------------------------
// Qwen3-Embedding family seed set
// ---------------------------------------------------------------------------

const QWEN3_SEEDS: Array<{ provider: string; id: string; native: number }> = [
  { provider: "nebius", id: "Qwen/Qwen3-Embedding-8B", native: 4096 },
  { provider: "deepinfra", id: "Qwen/Qwen3-Embedding-8B", native: 4096 },
  { provider: "deepinfra", id: "Qwen/Qwen3-Embedding-4B", native: 2560 },
  { provider: "deepinfra", id: "Qwen/Qwen3-Embedding-0.6B", native: 1024 },
  {
    provider: "fireworks",
    id: "accounts/fireworks/models/qwen3-embedding-8b",
    native: 4096,
  },
];

test("Qwen3-Embedding family rows are MRL with max = native dim", () => {
  for (const { provider, id, native } of QWEN3_SEEDS) {
    const m = getEmbeddingModel(provider, id);
    assert.ok(m, `missing ${provider}/${id}`);
    assert.equal(m.isMatryoshka, true, `${provider}/${id} isMatryoshka`);
    assert.equal(m.matryoshkaMode, "provider");
    assert.equal(m.dimensions, native);
    assert.equal(m.maxDimensions, native);
    assert.ok(typeof m.minDimensions === "number" && m.minDimensions > 0);
    assert.ok(Array.isArray(m.matryoshkaDimensions) && m.matryoshkaDimensions.length > 0);
    assert.ok(m.matryoshkaDimensions!.every((d) => d <= native));
    assert.equal(isAllowedEmbeddingDim(m, native), true);
    assert.equal(isAllowedEmbeddingDim(m, Math.min(512, native)), true);
    assert.equal(isAllowedEmbeddingDim(m, native + 1), false);
  }
});

// ---------------------------------------------------------------------------
// Helpers + negative cases
// ---------------------------------------------------------------------------

test("isMatryoshkaModel / getEmbeddingModelEntry resolve provider/model strings", () => {
  assert.equal(isMatryoshkaModel("gemini", "gemini-embedding-2"), true);
  assert.equal(isMatryoshkaModel("openai", "text-embedding-ada-002"), false);
  assert.equal(isMatryoshkaModel("mistral", "mistral-embed"), false);

  const entry = getEmbeddingModelEntry("openai/text-embedding-3-small");
  assert.ok(entry);
  assert.equal(entry.isMatryoshka, true);
  assert.equal(entry.dimensions, 1536);
});

test("non-MRL registry models must not claim matryoshka", () => {
  const nonMrlSamples: Array<[string, string]> = [
    ["openai", "text-embedding-ada-002"],
    ["mistral", "mistral-embed"],
    ["together", "BAAI/bge-large-en-v1.5"],
    ["deepinfra", "BAAI/bge-m3"],
    ["nvidia", "nvidia/nv-embedqa-e5-v5"],
    ["cohere", "embed-v4.0"],
  ];
  for (const [provider, id] of nonMrlSamples) {
    const m = getEmbeddingModel(provider, id);
    assert.ok(m, `expected model ${provider}/${id}`);
    assert.notEqual(m.isMatryoshka, true, `${provider}/${id} must not be matryoshka`);
    assert.equal(isAllowedEmbeddingDim(m, m.dimensions ?? 1), false);
  }
});

test("isAllowedEmbeddingDim rejects non-positive / non-integer dims", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-small");
  assert.ok(m);
  assert.equal(isAllowedEmbeddingDim(m, 0), false);
  assert.equal(isAllowedEmbeddingDim(m, -1), false);
  assert.equal(isAllowedEmbeddingDim(m, 512.5), false);
  assert.equal(isAllowedEmbeddingDim(m, Number.NaN), false);
});

test("isAllowedEmbeddingDim fails closed on incomplete range metadata", () => {
  // min-only without native dimensions → open-ended range rejected
  const minOnly: EmbeddingModel = {
    id: "synthetic-min-only",
    name: "Synthetic",
    isMatryoshka: true,
    minDimensions: 32,
  };
  assert.equal(isAllowedEmbeddingDim(minOnly, 64), false);
  assert.equal(isAllowedEmbeddingDim(minOnly, 32), false);

  // min + native dimensions closes the upper bound
  const minWithNative: EmbeddingModel = {
    id: "synthetic-min-native",
    name: "Synthetic",
    isMatryoshka: true,
    minDimensions: 32,
    dimensions: 1024,
  };
  assert.equal(isAllowedEmbeddingDim(minWithNative, 512), true);
  assert.equal(isAllowedEmbeddingDim(minWithNative, 2048), false);

  // max-only without native → fail closed
  const maxOnly: EmbeddingModel = {
    id: "synthetic-max-only",
    name: "Synthetic",
    isMatryoshka: true,
    maxDimensions: 1024,
  };
  assert.equal(isAllowedEmbeddingDim(maxOnly, 512), false);

  // allowlist alone still authorizes membership
  const listOnly: EmbeddingModel = {
    id: "synthetic-list",
    name: "Synthetic",
    isMatryoshka: true,
    matryoshkaDimensions: [256, 512],
  };
  assert.equal(isAllowedEmbeddingDim(listOnly, 256), true);
  assert.equal(isAllowedEmbeddingDim(listOnly, 384), false);
});

test("gemini MRL rows do not share matryoshkaDimensions array identity", () => {
  const a = getEmbeddingModel("gemini", "gemini-embedding-2");
  const b = getEmbeddingModel("gemini", "gemini-embedding-001");
  assert.ok(a && b);
  assert.ok(Array.isArray(a.matryoshkaDimensions));
  assert.ok(Array.isArray(b.matryoshkaDimensions));
  assert.notEqual(
    a.matryoshkaDimensions,
    b.matryoshkaDimensions,
    "each seed row should own a fresh allowlist array"
  );
});

test("every isMatryoshka seed exposes allowlist or valid min/max", () => {
  const mrlRows: EmbeddingModel[] = [];
  for (const config of Object.values(EMBEDDING_PROVIDERS)) {
    for (const model of config.models) {
      if (model.isMatryoshka === true) mrlRows.push(model);
    }
  }
  assert.ok(mrlRows.length >= 10, `expected ≥10 MRL seeds, got ${mrlRows.length}`);
  for (const m of mrlRows) {
    const hasList =
      Array.isArray(m.matryoshkaDimensions) && m.matryoshkaDimensions.length > 0;
    const hasRange =
      typeof m.minDimensions === "number" && typeof m.maxDimensions === "number";
    assert.ok(
      hasList || hasRange,
      `${m.id} MRL seed needs matryoshkaDimensions and/or min/max`
    );
    if (hasRange) {
      assert.ok(m.minDimensions! <= m.maxDimensions!);
      assert.ok(
        typeof m.dimensions !== "number" || m.dimensions <= m.maxDimensions!
      );
    }
    assert.ok(
      m.matryoshkaMode === "provider" ||
        m.matryoshkaMode === "client_truncate" ||
        m.matryoshkaMode === "none"
    );
  }
});
