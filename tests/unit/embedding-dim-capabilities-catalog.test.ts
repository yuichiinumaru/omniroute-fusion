/**
 * EPIC-21 T21-E / Task 0105 — public MRL capability fields on list/catalog mappers.
 *
 * Surfaces:
 * - GET /v1/embeddings list (`src/app/api/v1/embeddings/route.ts`)
 * - GET /v1/models catalog embedding entries (`src/app/api/v1/models/catalog.ts`)
 * Both use `toEmbeddingModelPublicMrlFields` + `getAllEmbeddingModels` from
 * `open-sse/config/embeddingRegistry.ts`.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  getAllEmbeddingModels,
  getEmbeddingModel,
  toEmbeddingModelPublicMrlFields,
  type EmbeddingModel,
  type FlatEmbeddingModelListEntry,
  type MatryoshkaMode,
} from "../../open-sse/config/embeddingRegistry.ts";

/** Partial registry row for mapper fixtures (no production `as EmbeddingModel`). */
type MrlMapperInput = Pick<
  EmbeddingModel,
  | "isMatryoshka"
  | "matryoshkaDimensions"
  | "minDimensions"
  | "maxDimensions"
  | "matryoshkaMode"
>;

/**
 * Mirrors GET `/v1/embeddings` list entry construction in
 * `src/app/api/v1/embeddings/route.ts` (built-in models only).
 */
function composeEmbeddingsListEntry(
  m: FlatEmbeddingModelListEntry,
  timestamp: number,
): Record<string, unknown> {
  return {
    id: m.id,
    object: "model",
    created: timestamp,
    owned_by: m.provider,
    type: "embedding",
    dimensions: m.dimensions ?? null,
    ...toEmbeddingModelPublicMrlFields(m),
  };
}

/**
 * Mirrors catalog embedding push in `src/app/api/v1/models/catalog.ts`.
 */
function composeCatalogEmbeddingEntry(
  embModel: FlatEmbeddingModelListEntry,
  timestamp: number,
): Record<string, unknown> {
  const rawModelId = embModel.id.split("/").pop() || embModel.id;
  return {
    id: embModel.id,
    object: "model",
    created: timestamp,
    owned_by: embModel.provider,
    root: rawModelId,
    type: "embedding",
    dimensions: embModel.dimensions,
    ...toEmbeddingModelPublicMrlFields(embModel),
  };
}

// ---------------------------------------------------------------------------
// Pure mapper
// ---------------------------------------------------------------------------

test("toEmbeddingModelPublicMrlFields: MRL seed exposes capability keys", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-small");
  assert.ok(m);
  const pub = toEmbeddingModelPublicMrlFields(m);
  assert.equal(pub.isMatryoshka, true);
  assert.equal(pub.matryoshkaMode, "provider");
  assert.equal(pub.minDimensions, 1);
  assert.equal(pub.maxDimensions, 1536);
  assert.ok(Array.isArray(pub.matryoshkaDimensions));
  const allow = pub.matryoshkaDimensions;
  assert.ok(allow);
  assert.ok(allow.includes(512));
  assert.ok(allow.includes(1536));
});

test("toEmbeddingModelPublicMrlFields: Gemini range fields present", () => {
  const m = getEmbeddingModel("gemini", "gemini-embedding-2");
  assert.ok(m);
  const pub = toEmbeddingModelPublicMrlFields(m);
  assert.equal(pub.isMatryoshka, true);
  assert.equal(pub.minDimensions, 128);
  assert.equal(pub.maxDimensions, 3072);
  const allow = pub.matryoshkaDimensions;
  assert.ok(allow);
  assert.ok(allow.includes(768));
  assert.ok(allow.includes(3072));
});

test("toEmbeddingModelPublicMrlFields: non-MRL returns empty object (no false positives)", () => {
  const ada = getEmbeddingModel("openai", "text-embedding-ada-002");
  assert.ok(ada);
  assert.deepEqual(toEmbeddingModelPublicMrlFields(ada), {});

  const empty: MrlMapperInput = {};
  assert.deepEqual(toEmbeddingModelPublicMrlFields(empty), {});

  const explicitFalse: MrlMapperInput = {
    isMatryoshka: false,
    matryoshkaDimensions: [512],
    minDimensions: 1,
    maxDimensions: 512,
    matryoshkaMode: "provider" satisfies MatryoshkaMode,
  };
  assert.deepEqual(toEmbeddingModelPublicMrlFields(explicitFalse), {});
});

test("toEmbeddingModelPublicMrlFields: copies allowlist (no shared-array mutation)", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-large");
  assert.ok(m);
  const seedAllow = m.matryoshkaDimensions;
  assert.ok(seedAllow);
  const pub = toEmbeddingModelPublicMrlFields(m);
  assert.ok(pub.matryoshkaDimensions);
  // Distinct array identity + same contents (callers cannot mutate shared seeds).
  assert.notEqual(pub.matryoshkaDimensions, seedAllow);
  assert.deepEqual(pub.matryoshkaDimensions, [...seedAllow]);
});

// ---------------------------------------------------------------------------
// getAllEmbeddingModels flat list (feeds GET /v1/embeddings + catalog)
// ---------------------------------------------------------------------------

test("getAllEmbeddingModels: openai/text-embedding-3-small carries MRL fields", () => {
  const row = getAllEmbeddingModels().find((m) => m.id === "openai/text-embedding-3-small");
  assert.ok(row, "missing openai/text-embedding-3-small in flat list");
  assert.equal(row.dimensions, 1536);
  assert.equal(row.isMatryoshka, true);
  assert.equal(row.matryoshkaMode, "provider");
  assert.equal(row.maxDimensions, 1536);
  assert.ok(row.matryoshkaDimensions?.includes(256));
});

test("getAllEmbeddingModels: openai/text-embedding-ada-002 has no MRL keys", () => {
  const row = getAllEmbeddingModels().find((m) => m.id === "openai/text-embedding-ada-002");
  assert.ok(row);
  assert.equal(row.dimensions, 1536);
  assert.equal(row.isMatryoshka, undefined);
  assert.equal(row.matryoshkaDimensions, undefined);
  assert.equal(row.minDimensions, undefined);
  assert.equal(row.maxDimensions, undefined);
  assert.equal(row.matryoshkaMode, undefined);
});

test("getAllEmbeddingModels: gemini/gemini-embedding-001 MRL range", () => {
  const row = getAllEmbeddingModels().find((m) => m.id === "gemini/gemini-embedding-001");
  assert.ok(row);
  assert.equal(row.isMatryoshka, true);
  assert.equal(row.dimensions, 768); // preferred default, not max
  assert.equal(row.minDimensions, 128);
  assert.equal(row.maxDimensions, 3072);
});

test("list-entry shape mirrors public mapper for every flat row", () => {
  for (const row of getAllEmbeddingModels()) {
    const fromMapper = toEmbeddingModelPublicMrlFields(row);
    if (row.isMatryoshka === true) {
      assert.equal(fromMapper.isMatryoshka, true, row.id);
      assert.equal(fromMapper.matryoshkaMode, row.matryoshkaMode, row.id);
      assert.equal(fromMapper.minDimensions, row.minDimensions, row.id);
      assert.equal(fromMapper.maxDimensions, row.maxDimensions, row.id);
      assert.deepEqual(fromMapper.matryoshkaDimensions, row.matryoshkaDimensions, row.id);
    } else {
      assert.deepEqual(fromMapper, {}, row.id);
    }
  }
});

// ---------------------------------------------------------------------------
// Surface composition (mirrors route GET + catalog push — field-drift guard)
// ---------------------------------------------------------------------------

test("GET /v1/embeddings list composition: MRL + non-MRL public shape", () => {
  const ts = 1_700_000_000;
  const all = getAllEmbeddingModels();
  const mrl = all.find((m) => m.id === "openai/text-embedding-3-small");
  const non = all.find((m) => m.id === "openai/text-embedding-ada-002");
  assert.ok(mrl);
  assert.ok(non);

  const mrlEntry = composeEmbeddingsListEntry(mrl, ts);
  assert.equal(mrlEntry.object, "model");
  assert.equal(mrlEntry.type, "embedding");
  assert.equal(mrlEntry.owned_by, "openai");
  assert.equal(mrlEntry.dimensions, 1536);
  assert.equal(mrlEntry.isMatryoshka, true);
  assert.equal(mrlEntry.matryoshkaMode, "provider");
  assert.equal(mrlEntry.maxDimensions, 1536);
  assert.ok(Array.isArray(mrlEntry.matryoshkaDimensions));
  // Must not leak registry-only name field
  assert.equal("name" in mrlEntry, false);

  const nonEntry = composeEmbeddingsListEntry(non, ts);
  assert.equal(nonEntry.dimensions, 1536);
  assert.equal("isMatryoshka" in nonEntry, false);
  assert.equal("matryoshkaDimensions" in nonEntry, false);
  assert.equal("minDimensions" in nonEntry, false);
  assert.equal("maxDimensions" in nonEntry, false);
  assert.equal("matryoshkaMode" in nonEntry, false);
});

test("catalog embedding composition: MRL fields + root id", () => {
  const ts = 1_700_000_000;
  const row = getAllEmbeddingModels().find((m) => m.id === "gemini/gemini-embedding-2");
  assert.ok(row);
  const entry = composeCatalogEmbeddingEntry(row, ts);
  assert.equal(entry.id, "gemini/gemini-embedding-2");
  assert.equal(entry.root, "gemini-embedding-2");
  assert.equal(entry.type, "embedding");
  assert.equal(entry.isMatryoshka, true);
  assert.equal(entry.minDimensions, 128);
  assert.equal(entry.maxDimensions, 3072);
  assert.equal(entry.dimensions, 768);
  assert.equal("name" in entry, false);
});
