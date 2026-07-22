/**
 * EPIC-21 T21-D / Task 0104 — client MRL prefix-truncate + L2 renorm.
 *
 * Pure helper coverage + handleEmbedding integration (mock full-dim vectors).
 * Registry helpers / renorm default come from Task 0103.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  EMBEDDING_MRL_CLIENT_RENORM_DEFAULT,
  getEmbeddingModel,
} from "../../open-sse/config/embeddingRegistry.ts";
import {
  EMBED_MRL_CLIENT_TRUNCATE_EVENT,
  applyClientMrlToEmbeddingData,
  l2Normalize,
  parseRequestedEmbeddingDim,
  prefixTruncateAndMaybeRenorm,
  validateRequestedMrlDim,
} from "../../open-sse/utils/embeddingMrl.ts";

function unitVector(n: number, fill = 1): number[] {
  // Equal components → easy L2 check after renorm.
  return new Array(n).fill(fill);
}

function l2Norm(v: readonly number[]): number {
  let s = 0;
  for (const x of v) s += x * x;
  return Math.sqrt(s);
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

test("EMBEDDING_MRL_CLIENT_RENORM_DEFAULT remains true (D4)", () => {
  assert.equal(EMBEDDING_MRL_CLIENT_RENORM_DEFAULT, true);
});

test("parseRequestedEmbeddingDim accepts positive integers only", () => {
  assert.equal(parseRequestedEmbeddingDim(512), 512);
  assert.equal(parseRequestedEmbeddingDim(undefined), null);
  assert.equal(parseRequestedEmbeddingDim(null), null);
  assert.equal(parseRequestedEmbeddingDim(0), null);
  assert.equal(parseRequestedEmbeddingDim(-1), null);
  assert.equal(parseRequestedEmbeddingDim(12.5), null);
  assert.equal(parseRequestedEmbeddingDim("512"), 512);
  assert.equal(parseRequestedEmbeddingDim("nope"), null);
});

test("l2Normalize produces unit length (within float tolerance)", () => {
  const v = [3, 4];
  const n = l2Normalize(v);
  assert.equal(n.length, 2);
  assert.ok(Math.abs(l2Norm(n) - 1) < 1e-9);
  assert.ok(Math.abs(n[0] - 0.6) < 1e-9);
  assert.ok(Math.abs(n[1] - 0.8) < 1e-9);
});

test("l2Normalize copies zero vector unchanged", () => {
  assert.deepEqual(l2Normalize([0, 0, 0]), [0, 0, 0]);
});

test("prefixTruncateAndMaybeRenorm shortens and renorms by default", () => {
  const full = unitVector(8, 2);
  const out = prefixTruncateAndMaybeRenorm(full, 4);
  assert.equal(out.length, 4);
  assert.ok(Math.abs(l2Norm(out) - 1) < 1e-9);
});

test("prefixTruncateAndMaybeRenorm can skip renorm when explicitly off", () => {
  const full = unitVector(6, 3);
  const out = prefixTruncateAndMaybeRenorm(full, 3, false);
  assert.deepEqual(out, [3, 3, 3]);
});

test("prefixTruncate no-op length when already at target (still renorms copy when on)", () => {
  const v = [3, 4];
  const out = prefixTruncateAndMaybeRenorm(v, 2, true);
  assert.equal(out.length, 2);
  assert.ok(Math.abs(l2Norm(out) - 1) < 1e-9);
});

// ---------------------------------------------------------------------------
// validateRequestedMrlDim (pre-upstream)
// ---------------------------------------------------------------------------

test("validateRequestedMrlDim: MRL invalid dim → reject", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-small");
  assert.ok(m);
  // maxDimensions for small is 1536; 4096 is out of range
  const r = validateRequestedMrlDim(m, 4096);
  assert.equal(r.ok, false);
  if (!r.ok) {
    assert.match(r.message, /Unsupported embedding dimensions/i);
    assert.match(r.message, /4096/);
  }
});

test("validateRequestedMrlDim: MRL allowed dim → ok", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-large");
  assert.ok(m);
  assert.equal(validateRequestedMrlDim(m, 512).ok, true);
  assert.equal(validateRequestedMrlDim(m, 3072).ok, true);
});

test("validateRequestedMrlDim: non-MRL / null model / no dim → ok (not pre-rejected)", () => {
  const ada = getEmbeddingModel("openai", "text-embedding-ada-002");
  assert.ok(ada);
  assert.equal(validateRequestedMrlDim(ada, 512).ok, true);
  assert.equal(validateRequestedMrlDim(null, 512).ok, true);
  assert.equal(validateRequestedMrlDim(ada, null).ok, true);
});

// ---------------------------------------------------------------------------
// applyClientMrlToEmbeddingData
// ---------------------------------------------------------------------------

test("apply: MRL full-dim mock → shortened vector + L2 ≈ 1", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-large");
  assert.ok(m);
  const full = unitVector(3072, 0.5);
  const result = applyClientMrlToEmbeddingData({
    dataField: [{ object: "embedding", embedding: full, index: 0 }],
    model: m,
    requestedDim: 512,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.truncated, true);
  assert.equal(result.fromDim, 3072);
  assert.equal(result.toDim, 512);
  assert.equal(result.count, 1);
  assert.equal(result.renorm, true);
  const emb = (result.data as Array<{ embedding: number[] }>)[0].embedding;
  assert.equal(emb.length, 512);
  assert.ok(Math.abs(l2Norm(emb) - 1) < 1e-6);
});

test("apply: no-op when vector.length === requested dim", () => {
  const m = getEmbeddingModel("gemini", "gemini-embedding-2");
  assert.ok(m);
  const v = unitVector(768, 0.1);
  const result = applyClientMrlToEmbeddingData({
    dataField: [{ object: "embedding", embedding: v, index: 0 }],
    model: m,
    requestedDim: 768,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.truncated, false);
  const emb = (result.data as Array<{ embedding: number[] }>)[0].embedding;
  assert.equal(emb.length, 768);
  // Original reference preserved (no rewrite when identity length)
  assert.equal(emb, v);
});

test("apply: does NOT truncate non-MRL even when N > d — returns 400", () => {
  const ada = getEmbeddingModel("openai", "text-embedding-ada-002");
  assert.ok(ada);
  assert.notEqual(ada.isMatryoshka, true);
  const result = applyClientMrlToEmbeddingData({
    dataField: [{ object: "embedding", embedding: unitVector(1536), index: 0 }],
    model: ada,
    requestedDim: 512,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 400);
  assert.match(result.message, /non-MRL/i);
  assert.match(result.message, /512/);
});

test("apply: unknown model pass-through on length mismatch (no silent truncate)", () => {
  const full = unitVector(1024);
  const result = applyClientMrlToEmbeddingData({
    dataField: [{ object: "embedding", embedding: full, index: 0 }],
    model: null,
    requestedDim: 256,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.truncated, false);
  const emb = (result.data as Array<{ embedding: number[] }>)[0].embedding;
  assert.equal(emb.length, 1024);
});

test("apply: batch inputs truncated consistently", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-small");
  assert.ok(m);
  const result = applyClientMrlToEmbeddingData({
    dataField: [
      { object: "embedding", embedding: unitVector(1536, 1), index: 0 },
      { object: "embedding", embedding: unitVector(1536, 2), index: 1 },
    ],
    model: m,
    requestedDim: 256,
    renorm: true,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.truncated, true);
  assert.equal(result.count, 2);
  const arr = result.data as Array<{ embedding: number[]; index: number }>;
  assert.equal(arr[0].embedding.length, 256);
  assert.equal(arr[1].embedding.length, 256);
  assert.ok(Math.abs(l2Norm(arr[0].embedding) - 1) < 1e-6);
  assert.ok(Math.abs(l2Norm(arr[1].embedding) - 1) < 1e-6);
});

test("apply: renorm off truncates without unit length", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-small");
  assert.ok(m);
  const result = applyClientMrlToEmbeddingData({
    dataField: [{ object: "embedding", embedding: unitVector(1536, 4), index: 0 }],
    model: m,
    requestedDim: 8,
    renorm: false,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  const emb = (result.data as Array<{ embedding: number[] }>)[0].embedding;
  assert.deepEqual(emb, unitVector(8, 4));
  assert.ok(l2Norm(emb) > 1);
});

test("apply: no requested dim → no-op", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-large");
  const full = unitVector(100);
  const result = applyClientMrlToEmbeddingData({
    dataField: [{ embedding: full }],
    model: m,
    requestedDim: null,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.truncated, false);
});

test("apply: MRL N < d pass-through (no pad)", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-large");
  assert.ok(m);
  const short = unitVector(64);
  const result = applyClientMrlToEmbeddingData({
    dataField: [{ embedding: short }],
    model: m,
    requestedDim: 512,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.truncated, false);
  assert.equal((result.data as Array<{ embedding: number[] }>)[0].embedding.length, 64);
});

test("apply: MRL invalid dim fails closed even without pre-upstream gate", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-small");
  assert.ok(m);
  // 99999 is outside small's range; pure helper must refuse (no silent cut).
  const result = applyClientMrlToEmbeddingData({
    dataField: [{ embedding: unitVector(1536) }],
    model: m,
    requestedDim: 99999,
  });
  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.status, 400);
  assert.match(result.message, /Unsupported embedding dimensions/i);
});

test("apply: base64 / non-float embeddings are not truncated (no silent corrupt)", () => {
  const m = getEmbeddingModel("openai", "text-embedding-3-large");
  assert.ok(m);
  const b64 = "AAAA"; // stand-in for encoding_format=base64 payload
  const result = applyClientMrlToEmbeddingData({
    dataField: [{ object: "embedding", embedding: b64, index: 0 }],
    model: m,
    requestedDim: 512,
  });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.truncated, false);
  assert.equal((result.data as Array<{ embedding: string }>)[0].embedding, b64);
});

test("EMBED_MRL_CLIENT_TRUNCATE_EVENT is the stable log name", () => {
  assert.equal(EMBED_MRL_CLIENT_TRUNCATE_EVENT, "embed.mrl_client_truncate");
});

// ---------------------------------------------------------------------------
// handleEmbedding integration
// ---------------------------------------------------------------------------

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "omniroute-embeddings-mrl-"));

const { handleEmbedding } = await import("../../open-sse/handlers/embeddings.ts");

test("handleEmbedding: MRL client truncate when upstream ignores dimensions", async () => {
  const originalFetch = globalThis.fetch;
  const logs: Array<{ tag: unknown; msg: unknown }> = [];

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        // Upstream ignored dimensions:512 and returned native 3072
        data: [{ object: "embedding", embedding: unitVector(3072, 1), index: 0 }],
        usage: { prompt_tokens: 2, total_tokens: 2 },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

  try {
    const result = await handleEmbedding({
      body: {
        model: "openai/text-embedding-3-large",
        input: "hello",
        dimensions: 512,
      },
      credentials: { apiKey: "k" },
      log: {
        info: (tag: unknown, msg: unknown) => {
          logs.push({ tag, msg });
        },
        error: () => {},
      },
    });

    assert.equal(result.success, true);
    if (!result.success) return;
    const emb = result.data.data[0].embedding as number[];
    assert.equal(emb.length, 512);
    assert.ok(Math.abs(l2Norm(emb) - 1) < 1e-6);
    // usage unchanged
    assert.deepEqual(result.data.usage, { prompt_tokens: 2, total_tokens: 2 });
    // structured truncate signal present
    const truncateLog = logs.find((l) => l.tag === EMBED_MRL_CLIENT_TRUNCATE_EVENT);
    assert.ok(truncateLog, "expected embed.mrl_client_truncate log");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handleEmbedding: unsupported MRL dim → 400 before upstream", async () => {
  const originalFetch = globalThis.fetch;
  let called = 0;
  globalThis.fetch = async () => {
    called += 1;
    return new Response("{}", { status: 200 });
  };

  try {
    const result = await handleEmbedding({
      body: {
        model: "openai/text-embedding-3-small",
        input: "x",
        dimensions: 99999,
      },
      credentials: { apiKey: "k" },
      log: null,
    });
    assert.equal(result.success, false);
    assert.equal(result.status, 400);
    assert.match(String(result.error), /Unsupported embedding dimensions/i);
    assert.equal(called, 0, "must not call upstream for invalid MRL dim");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handleEmbedding: non-MRL wrong length → 400, never silent truncate", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        data: [{ object: "embedding", embedding: unitVector(1536), index: 0 }],
        usage: { prompt_tokens: 1, total_tokens: 1 },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );

  try {
    const result = await handleEmbedding({
      body: {
        model: "openai/text-embedding-ada-002",
        input: "x",
        dimensions: 256,
      },
      credentials: { apiKey: "k" },
      log: null,
    });
    assert.equal(result.success, false);
    assert.equal(result.status, 400);
    assert.match(String(result.error), /non-MRL/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
