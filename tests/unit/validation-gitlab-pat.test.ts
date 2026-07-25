import test from "node:test";
import assert from "node:assert/strict";
import { validateProviderApiKey } from "../../src/lib/providers/validation.ts";
import { getRegistryEntry } from "../../open-sse/config/providerRegistry.ts";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("PAT validator returns valid when a working PAT is supplied against completions endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("/api/v4/code_suggestions/completions")) {
      return jsonResponse({
        choices: [{ text: "def test(): pass" }],
      });
    }
    return jsonResponse({ error: "not found" }, 404);
  };

  try {
    const res = await validateProviderApiKey({
      provider: "gitlab",
      apiKey: "glpat-validtoken",
    });

    assert.equal(res.valid, true);
    assert.equal(res.error, null);
    assert.equal(calls.length, 1);
    assert.match(calls[0], /\/api\/v4\/code_suggestions\/completions$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("PAT validator returns invalid when a wrong PAT is supplied", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = async (url) => {
    calls.push(String(url));
    if (String(url).endsWith("/api/v4/code_suggestions/completions")) {
      return jsonResponse({ message: "401 Unauthorized" }, 401);
    }
    return jsonResponse({ error: "not found" }, 404);
  };

  try {
    const res = await validateProviderApiKey({
      provider: "gitlab",
      apiKey: "glpat-invalid",
    });

    assert.equal(res.valid, false);
    assert.equal(res.error, "Invalid API key");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("PAT validator does NOT hit the OAuth-only direct_access endpoint", async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];

  globalThis.fetch = async (url) => {
    calls.push(String(url));
    return jsonResponse({ choices: [{ text: "ok" }] });
  };

  try {
    await validateProviderApiKey({
      provider: "gitlab",
      apiKey: "glpat-testtoken",
    });

    for (const url of calls) {
      assert.equal(
        url.includes("/api/v4/code_suggestions/direct_access"),
        false,
        `Validator should not hit direct_access endpoint: ${url}`
      );
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("getRegistryEntry('gitlab') returns PAT provider registry entry with models, context length and description", () => {
  const entry = getRegistryEntry("gitlab");
  assert.ok(entry, "Registry entry for 'gitlab' should exist");
  assert.equal(entry.id, "gitlab");
  assert.equal(entry.authType, "apikey");
  assert.equal(entry.executor, "gitlab");
  assert.ok(entry.models.length >= 1, "Should have at least one model");
  assert.ok(typeof entry.defaultContextLength === "number", "Should specify defaultContextLength");
  assert.match(String(entry.description), /code completion only/i);
});
