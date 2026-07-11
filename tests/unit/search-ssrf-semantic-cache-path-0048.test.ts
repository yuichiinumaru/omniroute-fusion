/**
 * Task 0048 — Search SSRF, semantic cache signature/format, path-segment injection,
 * search cache key (F-01-W2-001, F-01-W2-002, F-01-006, F-01-W2-004).
 */
import { describe, it, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-0048-"));
process.env.DATA_DIR = TEST_DATA_DIR;

const core = await import("../../src/lib/db/core.ts");
const providersDb = await import("../../src/lib/db/providers.ts");
const searchRoute = await import("../../src/app/api/v1/search/route.ts");
const { handleSearch } = await import("../../open-sse/handlers/search.ts");
const { computeCacheKey } = await import("../../open-sse/services/searchCache.ts");
const {
  generateSignature,
  extractSemanticCacheSignatureExtras,
  canServeSemanticCacheStreamHit,
  setCachedResponse,
  clearCache,
} = await import("../../src/lib/semanticCache.ts");
const { checkSemanticCache } = await import("../../open-sse/handlers/chatCore/semanticCache.ts");
const { isValidPathSegment, assertSafePathSegment } = await import(
  "../../src/shared/network/safePathSegment.ts"
);
const { storeStreamingSemanticCacheResponse } = await import(
  "../../open-sse/handlers/chatCore/streamingSemanticCacheStore.ts"
);

after(() => {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

async function resetStorage() {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

async function seedSearchConnection(
  provider: string,
  overrides: {
    apiKey?: string | null;
    providerSpecificData?: Record<string, unknown>;
  } = {}
) {
  return providersDb.createProviderConnection({
    provider,
    authType: "apikey",
    name: `${provider}-${Math.random().toString(16).slice(2, 8)}`,
    apiKey: overrides.apiKey ?? "test-search-key",
    isActive: true,
    testStatus: "active",
    providerSpecificData: overrides.providerSpecificData || {},
  });
}

// ─── F-01-006: path segment validation ───────────────────────────────────────

describe("isValidPathSegment (F-01-006)", () => {
  it("accepts simple alphanumeric voice/model ids", () => {
    assert.equal(isValidPathSegment("voice-9"), true);
    assert.equal(isValidPathSegment("inworld_tts_2"), true);
    assert.equal(isValidPathSegment("openai.tts-1"), true);
  });

  it("rejects path separators, traversal, query/fragment, empty", () => {
    for (const bad of [
      "a/b",
      "..",
      "../etc",
      "//",
      "a\\b",
      "a?x=1",
      "a#frag",
      "a%2e%2e",
      "",
      "   ",
      "evil/path",
    ]) {
      assert.equal(isValidPathSegment(bad), false, `expected reject: ${JSON.stringify(bad)}`);
    }
  });

  it("assertSafePathSegment throws on injection", () => {
    assert.throws(() => assertSafePathSegment("a/b"), /Invalid path segment/);
    assert.equal(assertSafePathSegment("safe-id"), "safe-id");
  });
});

// ─── F-01-W2-004: search cache key includes provider_options ─────────────────

describe("computeCacheKey provider_options (F-01-W2-004)", () => {
  it("differs when baseUrl in provider_options differs", () => {
    const base = ["q", "searxng-search", "web", 5, undefined, undefined, null] as const;
    const k1 = computeCacheKey(...base, { baseUrl: "http://127.0.0.1:8080" }, null);
    const k2 = computeCacheKey(...base, { baseUrl: "http://127.0.0.1:9090" }, null);
    assert.notEqual(k1, k2);
  });

  it("differs when content options differ", () => {
    const k1 = computeCacheKey("q", "youcom-search", "web", 5, undefined, undefined, null, null, {
      full_page: true,
    });
    const k2 = computeCacheKey("q", "youcom-search", "web", 5, undefined, undefined, null, null, {
      full_page: false,
    });
    assert.notEqual(k1, k2);
  });

  it("is stable when provider_options match", () => {
    const opts = { baseUrl: "http://127.0.0.1:8888", depth: "standard" };
    const k1 = computeCacheKey("hello", "linkup-search", "web", 5, "us", "en", null, opts, null);
    const k2 = computeCacheKey("hello", "linkup-search", "web", 5, "us", "en", null, opts, null);
    assert.equal(k1, k2);
  });
});

// ─── F-01-W2-002: semantic cache signature + format ──────────────────────────

describe("semantic cache signature extras (F-01-W2-002)", () => {
  it("differs when tools array present vs absent", () => {
    const messages = [{ role: "user", content: "hi" }];
    const without = generateSignature("gpt-4o", messages, 0, 1, undefined, {
      tools: null,
    });
    const withTools = generateSignature("gpt-4o", messages, 0, 1, undefined, {
      tools: [{ type: "function", function: { name: "search" } }],
    });
    assert.notEqual(without, withTools);
  });

  it("differs when response_format differs", () => {
    const messages = [{ role: "user", content: "hi" }];
    const free = generateSignature("gpt-4o", messages, 0, 1, undefined, {
      response_format: null,
    });
    const json = generateSignature("gpt-4o", messages, 0, 1, undefined, {
      response_format: { type: "json_object" },
    });
    assert.notEqual(free, json);
  });

  it("differs when clientResponseFormat differs", () => {
    const messages = [{ role: "user", content: "hi" }];
    const openai = generateSignature("gpt-4o", messages, 0, 1, undefined, {
      clientResponseFormat: "openai",
    });
    const claude = generateSignature("gpt-4o", messages, 0, 1, undefined, {
      clientResponseFormat: "claude",
    });
    assert.notEqual(openai, claude);
  });

  it("extractSemanticCacheSignatureExtras pulls tools from body", () => {
    const extras = extractSemanticCacheSignatureExtras(
      {
        tools: [{ type: "function", function: { name: "x" } }],
        temperature: 0,
      },
      { clientResponseFormat: "claude", stream: true }
    );
    assert.equal(extras.stream, true);
    assert.equal(extras.clientResponseFormat, "claude");
    assert.ok(Array.isArray(extras.tools));
  });

  it("canServeSemanticCacheStreamHit only allows openai", () => {
    assert.equal(canServeSemanticCacheStreamHit(undefined), true);
    assert.equal(canServeSemanticCacheStreamHit("openai"), true);
    assert.equal(canServeSemanticCacheStreamHit("claude"), false);
    assert.equal(canServeSemanticCacheStreamHit("gemini"), false);
    assert.equal(canServeSemanticCacheStreamHit("openai-responses"), false);
  });
});

describe("checkSemanticCache format-aware hits (F-01-W2-002)", () => {
  beforeEach(() => {
    clearCache();
  });

  it("skips stream HIT for claude client format even if body is cached", async () => {
    const body = {
      model: "gpt-4o",
      messages: [{ role: "user", content: "stream-format-test" }],
      temperature: 0,
    };
    const extras = extractSemanticCacheSignatureExtras(body, {
      clientResponseFormat: "claude",
      stream: true,
    });
    // Would-be stream signature under claude — still seed, then assert read path skips
    const sig = generateSignature("gpt-4o", body.messages, 0, 1, undefined, extras);
    setCachedResponse(sig, "gpt-4o", {
      choices: [{ message: { role: "assistant", content: "nope" } }],
    });

    const result = await checkSemanticCache({
      semanticCacheEnabled: true,
      body,
      clientRawRequest: { headers: {} },
      model: "gpt-4o",
      provider: "openai",
      stream: true,
      reqLogger: { logConvertedResponse: () => {} },
      effectiveServiceTier: undefined,
      connectionId: null,
      startTime: Date.now(),
      log: { debug: () => {} },
      persistAttemptLogs: () => {},
      apiKeyId: null,
      clientResponseFormat: "claude",
    });

    assert.equal(result, null, "claude stream must not serve OpenAI-shaped SSE hit");
  });

  it("serves non-stream OpenAI HIT when tools match signature", async () => {
    const body = {
      model: "gpt-4o",
      messages: [{ role: "user", content: "tools-match" }],
      temperature: 0,
      tools: [{ type: "function", function: { name: "lookup" } }],
    };
    const extras = extractSemanticCacheSignatureExtras(body, {
      clientResponseFormat: "openai",
      stream: false,
    });
    const sig = generateSignature("gpt-4o", body.messages, 0, 1, undefined, extras);
    setCachedResponse(sig, "gpt-4o", {
      id: "chatcmpl-tools",
      choices: [{ message: { role: "assistant", content: "cached" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    });

    const result = await checkSemanticCache({
      semanticCacheEnabled: true,
      body,
      clientRawRequest: { headers: {} },
      model: "gpt-4o",
      provider: "openai",
      stream: false,
      reqLogger: { logConvertedResponse: () => {} },
      effectiveServiceTier: undefined,
      connectionId: null,
      startTime: Date.now(),
      log: { debug: () => {} },
      persistAttemptLogs: () => {},
      apiKeyId: null,
      clientResponseFormat: "openai",
    });

    assert.ok(result?.success);
    assert.ok(result?.response);
    const text = await result!.response!.text();
    assert.ok(text.includes("cached"));
  });

  it("misses when tools differ from the seeded entry", async () => {
    const baseBody = {
      model: "gpt-4o",
      messages: [{ role: "user", content: "tools-diverge" }],
      temperature: 0,
    };
    const seedExtras = extractSemanticCacheSignatureExtras(
      { ...baseBody, tools: [{ type: "function", function: { name: "a" } }] },
      { clientResponseFormat: "openai", stream: false }
    );
    const sig = generateSignature("gpt-4o", baseBody.messages, 0, 1, undefined, seedExtras);
    setCachedResponse(sig, "gpt-4o", { choices: [{ message: { content: "seed" } }] });

    const result = await checkSemanticCache({
      semanticCacheEnabled: true,
      body: {
        ...baseBody,
        tools: [{ type: "function", function: { name: "b" } }],
      },
      clientRawRequest: { headers: {} },
      model: "gpt-4o",
      provider: "openai",
      stream: false,
      reqLogger: { logConvertedResponse: () => {} },
      effectiveServiceTier: undefined,
      connectionId: null,
      startTime: Date.now(),
      log: { debug: () => {} },
      persistAttemptLogs: () => {},
      apiKeyId: null,
      clientResponseFormat: "openai",
    });

    assert.equal(result, null);
  });

  it("does not store streaming responses for non-openai clients", () => {
    const stored: unknown[] = [];
    storeStreamingSemanticCacheResponse(
      {
        enabled: true,
        streamStatus: 200,
        streamResponseBody: {
          choices: [{ message: { role: "assistant", content: "x" } }],
        },
        body: { messages: [{ role: "user", content: "hi" }], temperature: 0 },
        headers: {},
        model: "gpt-4o",
        clientResponseFormat: "claude",
      },
      {
        isCacheableForWrite: () => true,
        isSmallEnoughForSemanticCache: () => true,
        generateSignature: () => "sig",
        setCachedResponse: (...a: unknown[]) => {
          stored.push(a);
        },
        extractSemanticCacheSignatureExtras: () => ({}),
        canServeSemanticCacheStreamHit: canServeSemanticCacheStreamHit,
      }
    );
    assert.equal(stored.length, 0);
  });
});

// ─── F-01-W2-001: search baseUrl SSRF ────────────────────────────────────────

describe("search baseUrl SSRF (F-01-W2-001)", () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it("ignores client baseUrl for commercial Serper (keeps registry origin)", async () => {
    await seedSearchConnection("serper-search");
    const originalFetch = globalThis.fetch;
    let capturedUrl = "";

    globalThis.fetch = async (url) => {
      capturedUrl = String(url);
      return new Response(JSON.stringify({ organic: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    try {
      const response = await searchRoute.POST(
        new Request("http://localhost/api/v1/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "ssrf probe serper",
            provider: "serper-search",
            provider_options: {
              baseUrl: "http://127.0.0.1:9/steal",
            },
          }),
        })
      );
      assert.equal(response.status, 200);
      assert.ok(
        capturedUrl.startsWith("https://google.serper.dev"),
        `expected registry host, got ${capturedUrl}`
      );
      assert.ok(!capturedUrl.includes("127.0.0.1"), "must not use client private baseUrl");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects metadata baseUrl override on commercial SearchAPI credentials", async () => {
    // Operator credential baseUrl pointing at IMDS must fail closed.
    const result = await handleSearch({
      query: "metadata probe",
      provider: "searchapi-search",
      maxResults: 5,
      searchType: "web",
      providerOptions: {},
      credentials: {
        apiKey: "searchapi-key",
        providerSpecificData: { baseUrl: "http://169.254.169.254/latest/meta-data/" },
      },
    });

    assert.equal(result.success, false);
    assert.ok(
      result.status === 400 || result.status === 502,
      `unexpected status ${result.status}`
    );
    assert.ok(
      /baseUrl|Blocked|Invalid|metadata|private|local/i.test(result.error || ""),
      `unexpected error: ${result.error}`
    );
  });

  it("blocks commercial client baseUrl to IMDS via route (no credential leak host)", async () => {
    await seedSearchConnection("searchapi-search");
    const originalFetch = globalThis.fetch;
    const captured: string[] = [];

    globalThis.fetch = async (url) => {
      captured.push(String(url));
      return new Response(JSON.stringify({ organic_results: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    };

    try {
      const response = await searchRoute.POST(
        new Request("http://localhost/api/v1/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "imds",
            provider: "searchapi-search",
            provider_options: {
              baseUrl: "http://169.254.169.254/latest/meta-data/",
            },
          }),
        })
      );
      assert.equal(response.status, 200);
      assert.equal(captured.length, 1);
      assert.ok(
        captured[0].startsWith("https://www.searchapi.io"),
        `expected SearchAPI registry host, got ${captured[0]}`
      );
      assert.ok(!captured[0].includes("169.254"), "IMDS host must never be used");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("still allows self-hosted SearXNG client baseUrl on loopback", async () => {
    const originalFetch = globalThis.fetch;
    let capturedUrl = "";

    globalThis.fetch = async (url) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          results: [
            {
              title: "ok",
              url: "https://example.com",
              content: "snippet",
              engines: ["ddg"],
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    };

    try {
      const response = await searchRoute.POST(
        new Request("http://localhost/api/v1/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: "self hosted",
            provider: "searxng-search",
            provider_options: { baseUrl: "http://127.0.0.1:9090/custom-search" },
          }),
        })
      );
      assert.equal(response.status, 200);
      assert.ok(capturedUrl.startsWith("http://127.0.0.1:9090/custom-search"));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("rejects SearXNG baseUrl pointing at cloud metadata", async () => {
    const result = await handleSearch({
      query: "meta",
      provider: "searxng-search",
      maxResults: 5,
      searchType: "web",
      providerOptions: { baseUrl: "http://169.254.169.254/" },
      credentials: { apiKey: null },
    });
    assert.equal(result.success, false);
    assert.ok(result.status === 400 || result.status === 502);
  });
});

