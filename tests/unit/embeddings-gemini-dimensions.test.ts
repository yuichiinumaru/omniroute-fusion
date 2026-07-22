import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATA_DIR = mkdtempSync(join(tmpdir(), "omniroute-embeddings-gemini-dim-"));

const { handleEmbedding } = await import("../../open-sse/handlers/embeddings.ts");

// EPIC-21 T21-A — Gemini OpenAI-shim dimensions fix (Task 0101).
//
// Gemini's OpenAI-compat shim at /v1beta/openai/embeddings accepts standard
// OpenAI `dimensions` and rejects the native `outputDimensionality` field with:
//   400 Unknown name "outputDimensionality": Cannot find field.
//
// D2: OpenAI-shim = `dimensions` only. OmniRoute MUST NOT inject
// `outputDimensionality` when the Gemini baseUrl is the OpenAI-compat path.
// See: docs/reports/audits/2026-07-19-embeddings-mrl-dimensions-investigation.md

function captureFetch(captured: { body?: Record<string, unknown> }) {
  return async (_url: unknown, options: { headers?: unknown; body?: unknown } = {}) => {
    captured.body = JSON.parse(String(options.body || "{}"));
    return new Response(
      JSON.stringify({
        data: [{ object: "embedding", embedding: new Array(1536).fill(0.1), index: 0 }],
        usage: { prompt_tokens: 4, total_tokens: 4 },
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  };
}

test("handleEmbedding forwards Gemini dimensions WITHOUT outputDimensionality (single input)", async () => {
  const originalFetch = globalThis.fetch;
  const captured: { body?: Record<string, unknown> } = {};
  globalThis.fetch = captureFetch(captured) as typeof fetch;

  try {
    const result = await handleEmbedding({
      body: {
        model: "gemini/text-embedding-004",
        input: "test",
        dimensions: 1536,
      },
      credentials: { apiKey: "gemini-key" },
      log: null,
    });

    assert.equal(result.success, true);
    // D2: OpenAI-style `dimensions` forwarded to the OpenAI-compat shim.
    assert.equal(captured.body?.dimensions, 1536);
    // D2: `outputDimensionality` must NOT be present — the OpenAI-compat shim
    // rejects it with 400 "Unknown name".
    assert.equal(
      "outputDimensionality" in (captured.body || {}),
      false,
      "outputDimensionality must not be injected on Gemini OpenAI-compat shim"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handleEmbedding forwards Gemini dimensions WITHOUT outputDimensionality (batch input)", async () => {
  const originalFetch = globalThis.fetch;
  const captured: { body?: Record<string, unknown> } = {};
  globalThis.fetch = captureFetch(captured) as typeof fetch;

  try {
    const result = await handleEmbedding({
      body: {
        model: "gemini/text-embedding-004",
        input: ["hello", "world"],
        dimensions: 1536,
      },
      credentials: { apiKey: "gemini-key" },
      log: null,
    });

    assert.equal(result.success, true);
    // D2: OpenAI-style `dimensions` forwarded to the OpenAI-compat shim.
    assert.equal(captured.body?.dimensions, 1536);
    // D2: `outputDimensionality` must NOT be present.
    assert.equal(
      "outputDimensionality" in (captured.body || {}),
      false,
      "outputDimensionality must not be injected on Gemini OpenAI-compat shim"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handleEmbedding does not inject outputDimensionality when dimensions is omitted (Gemini)", async () => {
  const originalFetch = globalThis.fetch;
  const captured: { body?: Record<string, unknown> } = {};
  globalThis.fetch = captureFetch(captured) as typeof fetch;

  try {
    const result = await handleEmbedding({
      body: {
        model: "gemini/text-embedding-004",
        input: "test",
      },
      credentials: { apiKey: "gemini-key" },
      log: null,
    });

    assert.equal(result.success, true);
    assert.equal(
      "outputDimensionality" in (captured.body || {}),
      false,
      "outputDimensionality must not be injected when the client did not request a specific size"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handleEmbedding does not inject outputDimensionality for non-Gemini providers", async () => {
  const originalFetch = globalThis.fetch;
  const captured: { body?: Record<string, unknown> } = {};
  globalThis.fetch = captureFetch(captured) as typeof fetch;

  try {
    const result = await handleEmbedding({
      body: {
        model: "openai/text-embedding-3-small",
        input: "test",
        dimensions: 1536,
      },
      credentials: { apiKey: "openai-key" },
      log: null,
    });

    assert.equal(result.success, true);
    // OpenAI gets the standard `dimensions` field — not `outputDimensionality`.
    assert.equal(captured.body?.dimensions, 1536);
    assert.equal(
      "outputDimensionality" in (captured.body || {}),
      false,
      "outputDimensionality is Gemini-specific and must not leak into other providers"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("handleEmbedding ignores non-finite/non-positive dimensions for Gemini", async () => {
  const originalFetch = globalThis.fetch;
  const captured: { body?: Record<string, unknown> } = {};
  globalThis.fetch = captureFetch(captured) as typeof fetch;

  try {
    const result = await handleEmbedding({
      body: {
        model: "gemini/text-embedding-004",
        input: "test",
        dimensions: 0,
      },
      credentials: { apiKey: "gemini-key" },
      log: null,
    });

    assert.equal(result.success, true);
    assert.equal(
      "outputDimensionality" in (captured.body || {}),
      false,
      "0/NaN/negative dimensions must not map to outputDimensionality"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// Registry seed production model id (embeddingRegistry.ts gemini models).
// Operator report used dimensions:768 on the OpenAI-compat shim.
test("handleEmbedding forwards registry seed gemini/gemini-embedding-2 dimensions WITHOUT outputDimensionality", async () => {
  const originalFetch = globalThis.fetch;
  const captured: { body?: Record<string, unknown> } = {};
  globalThis.fetch = captureFetch(captured) as typeof fetch;

  try {
    const result = await handleEmbedding({
      body: {
        model: "gemini/gemini-embedding-2",
        input: "test",
        dimensions: 768,
      },
      credentials: { apiKey: "gemini-key" },
      log: null,
    });

    assert.equal(result.success, true);
    assert.equal(captured.body?.dimensions, 768);
    assert.equal(
      "outputDimensionality" in (captured.body || {}),
      false,
      "registry seed gemini-embedding-2 must use dimensions only on OpenAI-shim"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
