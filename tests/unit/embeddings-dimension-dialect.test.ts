/**
 * EPIC-21 T21-B / Task 0102 — embedding dimension dialect SSoT.
 *
 * Pure helper coverage + handleEmbedding integration for non-Gemini OpenAI path.
 * Gemini OpenAI-shim regression suite remains in embeddings-gemini-dimensions.test.ts.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  applyEmbeddingDimensions,
  isGeminiNativeBaseUrl,
  isGeminiOpenAiShimBaseUrl,
  resolveEmbeddingDimensionDialect,
} from "../../open-sse/config/embeddingDimensionDialect.ts";

// ---------------------------------------------------------------------------
// Pure dialect resolution
// ---------------------------------------------------------------------------

const GEMINI_OPENAI_SHIM_URL =
  "https://generativelanguage.googleapis.com/v1beta/openai/embeddings";

const GEMINI_NATIVE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";

test("resolveEmbeddingDimensionDialect: default OpenAI provider → dimensions", () => {
  const d = resolveEmbeddingDimensionDialect({
    providerId: "openai",
    baseUrl: "https://api.openai.com/v1/embeddings",
  });
  assert.equal(d.mode, "openai-compat");
  assert.equal(d.dimensionParam, "dimensions");
  assert.ok(d.stripFields.includes("outputDimensionality"));
});

test("resolveEmbeddingDimensionDialect: unknown provider defaults to openai-compat", () => {
  const d = resolveEmbeddingDimensionDialect({ providerId: "nebius" });
  assert.equal(d.mode, "openai-compat");
  assert.equal(d.dimensionParam, "dimensions");
});

test("resolveEmbeddingDimensionDialect: gemini + production OpenAI-shim baseUrl", () => {
  const d = resolveEmbeddingDimensionDialect({
    providerId: "gemini",
    baseUrl: GEMINI_OPENAI_SHIM_URL,
  });
  assert.equal(d.mode, "gemini-openai-shim");
  assert.equal(d.dimensionParam, "dimensions");
  assert.ok(d.stripFields.includes("outputDimensionality"));
  assert.equal(d.stripFields.includes("dimensions"), false);
});

test("resolveEmbeddingDimensionDialect: gemini without baseUrl defaults to OpenAI-shim", () => {
  // Production registry always has the openai-shim URL; missing baseUrl must
  // NOT select native mode (would reintroduce the 0101 bug class).
  const d = resolveEmbeddingDimensionDialect({ providerId: "gemini" });
  assert.equal(d.mode, "gemini-openai-shim");
  assert.equal(d.dimensionParam, "dimensions");
});

test("resolveEmbeddingDimensionDialect: gemini native baseUrl → outputDimensionality", () => {
  const d = resolveEmbeddingDimensionDialect({
    providerId: "gemini",
    baseUrl: GEMINI_NATIVE_URL,
  });
  assert.equal(d.mode, "gemini-native");
  assert.equal(d.dimensionParam, "outputDimensionality");
  assert.ok(d.stripFields.includes("dimensions"));
});

test("isGeminiOpenAiShimBaseUrl: production registry URL matches", () => {
  assert.equal(isGeminiOpenAiShimBaseUrl(GEMINI_OPENAI_SHIM_URL), true);
  assert.equal(isGeminiOpenAiShimBaseUrl("https://api.openai.com/v1/embeddings"), false);
  assert.equal(isGeminiOpenAiShimBaseUrl(null), false);
});

test("isGeminiNativeBaseUrl: never true for OpenAI-shim URL", () => {
  assert.equal(isGeminiNativeBaseUrl(GEMINI_OPENAI_SHIM_URL), false);
  assert.equal(isGeminiNativeBaseUrl(GEMINI_NATIVE_URL), true);
  assert.equal(
    isGeminiNativeBaseUrl(
      "https://generativelanguage.googleapis.com/v1beta/models/x:batchEmbedContents",
    ),
    true,
  );
});

// ---------------------------------------------------------------------------
// Pure applyEmbeddingDimensions
// ---------------------------------------------------------------------------

test("applyEmbeddingDimensions: OpenAI forwards dimensions only", () => {
  const out = applyEmbeddingDimensions({
    providerId: "openai",
    baseUrl: "https://api.openai.com/v1/embeddings",
    clientDimensions: 1536,
    upstreamBody: { model: "text-embedding-3-small", input: "hi" },
  });
  assert.equal(out.dimensions, 1536);
  assert.equal("outputDimensionality" in out, false);
  assert.equal(out.model, "text-embedding-3-small");
});

test("applyEmbeddingDimensions: Gemini OpenAI-shim strips client-sent outputDimensionality", () => {
  const out = applyEmbeddingDimensions({
    providerId: "gemini",
    baseUrl: GEMINI_OPENAI_SHIM_URL,
    clientDimensions: 768,
    upstreamBody: {
      model: "gemini-embedding-2",
      input: "hi",
      // Simulate a leak from a prior dual-inject or client extra key.
      outputDimensionality: 768,
      dimensions: 999,
    },
  });
  assert.equal(out.dimensions, 768);
  assert.equal("outputDimensionality" in out, false);
});

test("applyEmbeddingDimensions: Gemini OpenAI-shim omits dimensions when client omits them", () => {
  const out = applyEmbeddingDimensions({
    providerId: "gemini",
    baseUrl: GEMINI_OPENAI_SHIM_URL,
    clientDimensions: undefined,
    upstreamBody: {
      model: "gemini-embedding-2",
      input: "hi",
      outputDimensionality: 512,
    },
  });
  assert.equal("dimensions" in out, false);
  assert.equal("outputDimensionality" in out, false);
});

test("applyEmbeddingDimensions: Gemini native maps dimensions → outputDimensionality", () => {
  const out = applyEmbeddingDimensions({
    providerId: "gemini",
    baseUrl: GEMINI_NATIVE_URL,
    clientDimensions: 768,
    upstreamBody: {
      model: "text-embedding-004",
      input: "hi",
      dimensions: 768,
    },
  });
  assert.equal(out.outputDimensionality, 768);
  assert.equal("dimensions" in out, false);
});

test("applyEmbeddingDimensions: Gemini native ignores non-positive dimensions", () => {
  const out = applyEmbeddingDimensions({
    providerId: "gemini",
    baseUrl: GEMINI_NATIVE_URL,
    clientDimensions: 0,
    upstreamBody: { model: "m", input: "hi" },
  });
  assert.equal("outputDimensionality" in out, false);
  assert.equal("dimensions" in out, false);
});

test("applyEmbeddingDimensions: does not mutate the input upstreamBody", () => {
  const original: Record<string, unknown> = {
    model: "m",
    input: "x",
    outputDimensionality: 1,
  };
  const snapshot = { ...original };
  applyEmbeddingDimensions({
    providerId: "openai",
    clientDimensions: 8,
    upstreamBody: original,
  });
  assert.deepEqual(original, snapshot);
});

// ---------------------------------------------------------------------------
// handleEmbedding integration — non-Gemini dimensions forward
// ---------------------------------------------------------------------------

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "omniroute-embeddings-dim-dialect-"));

const { handleEmbedding } = await import("../../open-sse/handlers/embeddings.ts");

function captureFetch(captured: { body?: Record<string, unknown> }) {
  return async (_url: unknown, options: { headers?: unknown; body?: unknown } = {}) => {
    captured.body = JSON.parse(String(options.body || "{}"));
    return new Response(
      JSON.stringify({
        data: [{ object: "embedding", embedding: new Array(8).fill(0.01), index: 0 }],
        usage: { prompt_tokens: 2, total_tokens: 2 },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
}

test("handleEmbedding: OpenAI forwards dimensions via dialect (non-Gemini path)", async () => {
  const originalFetch = globalThis.fetch;
  const captured: { body?: Record<string, unknown> } = {};
  globalThis.fetch = captureFetch(captured) as typeof fetch;

  try {
    const result = await handleEmbedding({
      body: {
        model: "openai/text-embedding-3-small",
        input: "dialect-ssot",
        dimensions: 512,
      },
      credentials: { apiKey: "openai-key" },
      log: null,
    });

    assert.equal(result.success, true);
    assert.equal(captured.body?.dimensions, 512);
    assert.equal(
      "outputDimensionality" in (captured.body || {}),
      false,
      "OpenAI path must not receive Gemini-native dimension field",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handleEmbedding: strips client-sent outputDimensionality on Gemini OpenAI-shim", async () => {
  const originalFetch = globalThis.fetch;
  const captured: { body?: Record<string, unknown> } = {};
  globalThis.fetch = captureFetch(captured) as typeof fetch;

  try {
    const result = await handleEmbedding({
      body: {
        model: "gemini/text-embedding-004",
        input: "strip-me",
        dimensions: 768,
        // Client (or legacy dual-inject) must not reach Google's OpenAI shim.
        outputDimensionality: 768,
      },
      credentials: { apiKey: "gemini-key" },
      log: null,
    });

    assert.equal(result.success, true);
    assert.equal(captured.body?.dimensions, 768);
    assert.equal(
      "outputDimensionality" in (captured.body || {}),
      false,
      "outputDimensionality must be stripped by dialect SSoT on Gemini OpenAI-shim",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
