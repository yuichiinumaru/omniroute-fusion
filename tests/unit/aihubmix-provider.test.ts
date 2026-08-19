import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-aihubmix-test-"));
process.env.DATA_DIR = TEST_DATA_DIR;

const {
  APIKEY_PROVIDERS,
  AGGREGATOR_PROVIDER_IDS,
  getProviderById,
} = await import("../../src/shared/constants/providers.ts");
const { PROVIDER_ENDPOINTS } = await import("../../src/shared/constants/config.ts");
const { REGISTRY: providerRegistry } = await import("../../open-sse/config/providerRegistry.ts");
const { getExecutor } = await import("../../open-sse/executors/index.ts");
const { ProviderSchema } = await import("../../src/shared/validation/providerSchema.ts");
const core = await import("../../src/lib/db/core.ts");
const providersDb = await import("../../src/lib/db/providers.ts");
const modelsRoute = await import("../../src/app/api/providers/[id]/models/route.ts");

async function resetStorage() {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

test.after(() => {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

test("AIHubMix validates against ProviderSchema at module load time", () => {
  const aihubmix = APIKEY_PROVIDERS.aihubmix;
  assert.ok(aihubmix, "APIKEY_PROVIDERS.aihubmix must be defined");
  assert.equal(aihubmix.id, "aihubmix");
  assert.equal(aihubmix.alias, "aihubmix");
  assert.equal(aihubmix.name, "AIHubMix");
  assert.equal(aihubmix.icon, "router");
  assert.equal(aihubmix.color, "#6366F1");
  assert.equal(aihubmix.textIcon, "AHM");
  assert.equal(aihubmix.website, "https://aihubmix.com");
  assert.equal(aihubmix.passthroughModels, true);
  assert.equal(aihubmix.hasFree, true);
  assert.equal(aihubmix.freeNote, "Free tier models available with -free suffix");

  // Validate with ProviderSchema directly
  const parseResult = ProviderSchema.safeParse(aihubmix);
  assert.equal(parseResult.success, true, "aihubmix must pass ProviderSchema validation");

  // Also check getProviderById
  const byId = getProviderById("aihubmix");
  assert.ok(byId, "getProviderById('aihubmix') must return provider definition");
  assert.equal(byId?.id, "aihubmix");
});

test("AIHubMix is included in AGGREGATOR_PROVIDER_IDS", () => {
  assert.ok(
    AGGREGATOR_PROVIDER_IDS.has("aihubmix"),
    "AGGREGATOR_PROVIDER_IDS must contain 'aihubmix'"
  );
});

test("AIHubMix defines canonical endpoint in PROVIDER_ENDPOINTS", () => {
  assert.equal(
    PROVIDER_ENDPOINTS.aihubmix,
    "https://aihubmix.com/v1/chat/completions"
  );
});

test("AIHubMix registry entry uses default executor, openai format, and bearer auth", () => {
  const entry = providerRegistry.aihubmix;
  assert.ok(entry, "providerRegistry.aihubmix must be defined");
  assert.equal(entry.id, "aihubmix");
  assert.equal(entry.alias, "aihubmix");
  assert.equal(entry.format, "openai");
  assert.equal(entry.executor, "default");
  assert.equal(entry.baseUrl, "https://aihubmix.com/v1");
  assert.equal(entry.modelsUrl, "https://aihubmix.com/v1/models");
  assert.equal(entry.authType, "apikey");
  assert.equal(entry.authHeader, "bearer");
  assert.equal(entry.defaultContextLength, 128000);
});

test("AIHubMix registry exports 4 initial free models with capability flags", () => {
  const models = providerRegistry.aihubmix.models;
  assert.ok(Array.isArray(models), "models must be an array");
  assert.equal(models.length, 4, "expect exactly 4 initial free models");

  const modelMap = new Map(models.map((m: { id: string }) => [m.id, m]));

  const kimi = modelMap.get("coding-kimi-k3-free");
  assert.ok(kimi, "coding-kimi-k3-free must exist");
  assert.equal(kimi.name, "Coding Kimi K3 (Free)");
  assert.equal(kimi.toolCalling, true);
  assert.equal(kimi.supportsReasoning, true);
  assert.equal(kimi.contextLength, 128000);
  assert.equal(kimi.maxOutputTokens, 8192);

  const glm = modelMap.get("coding-glm-5.2-free");
  assert.ok(glm, "coding-glm-5.2-free must exist");
  assert.equal(glm.name, "Coding GLM 5.2 (Free)");
  assert.equal(glm.toolCalling, true);
  assert.equal(glm.supportsReasoning, true);
  assert.equal(glm.contextLength, 128000);
  assert.equal(glm.maxOutputTokens, 8192);

  const geminiFlash = modelMap.get("gemini-3.7-flash-free");
  assert.ok(geminiFlash, "gemini-3.7-flash-free must exist");
  assert.equal(geminiFlash.name, "Gemini 3.7 Flash (Free)");
  assert.equal(geminiFlash.toolCalling, true);
  assert.equal(geminiFlash.supportsReasoning, true);
  assert.equal(geminiFlash.supportsVision, true);
  assert.equal(geminiFlash.contextLength, 1048576);
  assert.equal(geminiFlash.maxOutputTokens, 65536);

  const geminiLite = modelMap.get("gemini-3.5-flash-lite-free");
  assert.ok(geminiLite, "gemini-3.5-flash-lite-free must exist");
  assert.equal(geminiLite.name, "Gemini 3.5 Flash Lite (Free)");
  assert.equal(geminiLite.toolCalling, true);
  assert.equal(geminiLite.supportsVision, true);
  assert.equal(geminiLite.contextLength, 1048576);
  assert.equal(geminiLite.maxOutputTokens, 65536);
});

test("getExecutor('aihubmix') returns DefaultExecutor configured with baseUrl and Bearer auth header", () => {
  const executor = getExecutor("aihubmix");
  assert.ok(executor, "executor for aihubmix must be returned");
  assert.equal(executor.provider, "aihubmix");
  assert.equal(executor.config.baseUrl, "https://aihubmix.com/v1");

  const credentials = {
    apiKey: "test-aihubmix-key-12345",
  };

  const url = executor.buildUrl("gemini-3.7-flash-free", true, credentials);
  assert.equal(url, "https://aihubmix.com/v1");

  const headers = executor.buildHeaders(credentials, true);
  assert.equal(headers["Content-Type"], "application/json");
  assert.equal(headers["Authorization"], "Bearer test-aihubmix-key-12345");
});

test("dynamic models route recognizes aihubmix in NAMED_OPENAI_STYLE_PROVIDERS and discovers models live", async () => {
  await resetStorage();
  const connection = await providersDb.createProviderConnection({
    provider: "aihubmix",
    authType: "apikey",
    name: "aihubmix-connection-live",
    apiKey: "sk-ahm-mock-key",
  });

  let probedUrl: string | null = null;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    probedUrl = String(url);
    const authHeader = (init?.headers as Record<string, string>)?.[
      "Authorization"
    ] || (init?.headers as Record<string, string>)?.[
      "authorization"
    ];
    assert.equal(authHeader, "Bearer sk-ahm-mock-key");

    if (String(url) === "https://aihubmix.com/v1/models") {
      return Response.json({
        object: "list",
        data: [
          { id: "coding-kimi-k3-free" },
          { id: "gpt-4o-mini" },
          { id: "claude-3-5-sonnet" },
        ],
      });
    }
    return new Response("not found", { status: 404 });
  };

  try {
    const response = await modelsRoute.GET(
      new Request(
        `http://localhost/api/providers/${connection.id}/models?refresh=true`
      ),
      { params: { id: connection.id } }
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      provider: string;
      source?: string;
      models: Array<{ id: string }>;
    };
    assert.equal(body.provider, "aihubmix");
    assert.equal(body.source, "api");
    assert.equal(probedUrl, "https://aihubmix.com/v1/models");
    const ids = body.models.map((m) => m.id);
    assert.ok(ids.includes("coding-kimi-k3-free"));
    assert.ok(ids.includes("gpt-4o-mini"));
    assert.ok(ids.includes("claude-3-5-sonnet"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("dynamic models route falls back to local registry when upstream is unavailable", async () => {
  await resetStorage();
  const connection = await providersDb.createProviderConnection({
    provider: "aihubmix",
    authType: "apikey",
    name: "aihubmix-connection-fallback",
    apiKey: "sk-ahm-mock-key-fallback",
  });

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("bad gateway", { status: 502 });

  try {
    const response = await modelsRoute.GET(
      new Request(
        `http://localhost/api/providers/${connection.id}/models?refresh=true`
      ),
      { params: { id: connection.id } }
    );
    assert.equal(response.status, 200);
    const body = (await response.json()) as {
      provider: string;
      source?: string;
      models: Array<{ id: string }>;
    };
    assert.equal(body.provider, "aihubmix");
    assert.equal(body.source, "local_catalog");
    const ids = body.models.map((m) => m.id);
    assert.equal(ids.length, 4);
    assert.ok(ids.includes("coding-kimi-k3-free"));
    assert.ok(ids.includes("coding-glm-5.2-free"));
    assert.ok(ids.includes("gemini-3.7-flash-free"));
    assert.ok(ids.includes("gemini-3.5-flash-lite-free"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});
