import test from "node:test";
import assert from "node:assert/strict";

const { GrokCliExecutor } = await import("@omniroute/open-sse/executors/grok-cli");
const { DefaultExecutor } = await import("@omniroute/open-sse/executors/default");
const { getExecutor } = await import("@omniroute/open-sse/executors/index");
const { grok_cliProvider } =
  await import("@omniroute/open-sse/config/providers/registry/grok-cli/index");
const { xaiProvider } =
  await import("@omniroute/open-sse/config/providers/registry/xai/index");
const {
  GROK_BUILD_RESPONSES_URL,
  GROK_BUILD_MODELS_URL,
  getGrokBuildClientVersion,
} = await import("@omniroute/open-sse/config/grokBuild");
const { sanitizeErrorMessageForResponse } = await import("@omniroute/open-sse/utils/error");
const { resolveModelOrError } = await import("../../src/sse/handlers/chatHelpers.ts");

// ---------------------------------------------------------------------------
// Source-of-truth matrix (source inspection 2026-08-12; grok-4.6 added
// 2026-08-16 per operator confirmation — live SSoT /v1/models returns 401
// without auth; passthroughModels: true keeps the registry informational)
// ---------------------------------------------------------------------------

const GROK_CLI_MATRIX = {
  providerId: "grok-cli",
  alias: "gc",
  authType: "oauth",
  executor: "grok-cli",
  endpoint: GROK_BUILD_RESPONSES_URL,
  modelsUrl: GROK_BUILD_MODELS_URL,
  clientVersion: getGrokBuildClientVersion(),
  registeredModels: ["grok-4.6", "grok-4.5", "grok-composer-2.5-fast"],
  defaultModel: "grok-composer-2.5-fast",
  targetFormat: "openai-responses",
  passthroughModels: true,
};

const XAI_MATRIX = {
  providerId: "xai",
  alias: "xai",
  authType: "apikey",
  executor: "default",
  endpoint: "https://api.x.ai/v1/chat/completions",
  registeredModels: [
    "grok-4.3",
    "grok-build-0.1",
    "grok-4.20-multi-agent-0309",
    "grok-4.20-0309-reasoning",
    "grok-4.20-0309-non-reasoning",
  ],
  defaultModel: null,
  targetFormat: "openai",
  passthroughModels: false,
};

// ---------------------------------------------------------------------------
// Provider registry/matrix boundaries
// ---------------------------------------------------------------------------

test("grok-cli registry matches source-of-truth matrix", () => {
  assert.equal(grok_cliProvider.id, GROK_CLI_MATRIX.providerId);
  assert.equal(grok_cliProvider.alias, GROK_CLI_MATRIX.alias);
  assert.equal(grok_cliProvider.authType, GROK_CLI_MATRIX.authType);
  assert.equal(grok_cliProvider.executor, GROK_CLI_MATRIX.executor);
  assert.equal(grok_cliProvider.format, "openai");
  assert.equal(grok_cliProvider.passthroughModels, true);

  const modelIds = grok_cliProvider.models.map((m) => m.id);
  assert.deepEqual(modelIds, GROK_CLI_MATRIX.registeredModels);
});

test("xai registry remains separate and does not include grok-cli models", () => {
  assert.equal(xaiProvider.id, XAI_MATRIX.providerId);
  assert.equal(xaiProvider.alias, XAI_MATRIX.alias);
  assert.equal(xaiProvider.authType, XAI_MATRIX.authType);
  assert.equal(xaiProvider.executor, XAI_MATRIX.executor);
  assert.equal(xaiProvider.passthroughModels, undefined);

  const modelIds = xaiProvider.models.map((m) => m.id);
  assert.deepEqual(modelIds, XAI_MATRIX.registeredModels);

  // grok-build-0.1 belongs to xai, not grok-cli.
  assert.ok(
    modelIds.includes("grok-build-0.1"),
    "grok-build-0.1 must remain under xai unless explicit source evidence moves it"
  );
  assert.ok(
    !modelIds.includes("grok-4.5"),
    "grok-4.5 must not be registered under xai"
  );
});

test("grok-cli and xai provider IDs do not alias into each other", () => {
  assert.notEqual(GROK_CLI_MATRIX.providerId, XAI_MATRIX.providerId);
  assert.notEqual(GROK_CLI_MATRIX.alias, XAI_MATRIX.alias);
});

// ---------------------------------------------------------------------------
// Executor resolution boundaries
// ---------------------------------------------------------------------------

test("getExecutor('grok-cli') resolves to GrokCliExecutor", () => {
  const executor = getExecutor("grok-cli");
  assert.ok(executor instanceof GrokCliExecutor);
});

test("getExecutor('xai') resolves to DefaultExecutor, not GrokCliExecutor", () => {
  const executor = getExecutor("xai");
  assert.ok(executor instanceof DefaultExecutor);
  assert.ok(!(executor instanceof GrokCliExecutor));
});

test("grok-cli alias 'gc' also resolves to GrokCliExecutor", () => {
  const executor = getExecutor("gc");
  assert.ok(executor instanceof GrokCliExecutor);
});

// ---------------------------------------------------------------------------
// Outgoing request boundary: endpoint, headers, body model, target format
// ---------------------------------------------------------------------------

test("GrokCliExecutor buildUrl always targets /v1/responses regardless of model", () => {
  const executor = new GrokCliExecutor();

  for (const model of GROK_CLI_MATRIX.registeredModels) {
    const url = executor.buildUrl(model, true, 0, null);
    assert.equal(url, GROK_BUILD_RESPONSES_URL);
  }

  // Unknown model IDs must not redirect to chat/completions.
  const unknownUrl = executor.buildUrl("grok-build", false, 0, null);
  assert.equal(unknownUrl, GROK_BUILD_RESPONSES_URL);
});

test("GrokCliExecutor buildHeaders emits redacted session metadata for known models", () => {
  const executor = new GrokCliExecutor();
  const credentials = {
    accessToken: "at_provenance_secret_123",
    refreshToken: "rt_provenance_secret_456",
    email: "user@example.com",
    providerSpecificData: {
      userId: "usr_provenance_123",
      principalType: "User",
    },
  };

  const headers = executor.buildHeaders(credentials, true, null, "grok-4.5");

  // Auth and session headers present.
  assert.equal(headers["Authorization"], "Bearer at_provenance_secret_123");
  assert.equal(headers["X-XAI-Token-Auth"], "xai-grok-cli");
  assert.equal(headers["x-grok-model-override"], "grok-4.5");
  assert.equal(headers["x-userid"], "usr_provenance_123");
  assert.equal(headers["x-email"], "user@example.com");
  assert.equal(headers["Accept"], "text/event-stream");

  // Client headers present.
  assert.equal(headers["x-grok-client-version"], GROK_CLI_MATRIX.clientVersion);
  assert.equal(headers["x-grok-client-identifier"], "grok-shell");

  // No raw tokens in User-Agent or other non-auth headers.
  const sensitive = ["at_provenance_secret_123", "rt_provenance_secret_456"];
  for (const secret of sensitive) {
    assert.equal(headers["User-Agent"]?.includes(secret), false);
    assert.equal(headers["x-grok-client-version"]?.includes(secret), false);
  }
});

test("GrokCliExecutor transformRequest preserves known model IDs and target format defaults", () => {
  const executor = new GrokCliExecutor();

  for (const model of GROK_CLI_MATRIX.registeredModels) {
    const out = executor.transformRequest(
      model,
      { input: [{ type: "message", role: "user", content: "hi" }] },
      false,
      {} as never
    ) as Record<string, unknown>;

    assert.equal(out.model, model, `model ${model} must not be remapped`);
    assert.equal(out.store, false);
    assert.deepEqual(out.include, ["reasoning.encrypted_content"]);
    assert.equal(out.stream, false);
  }
});

test("GrokCliExecutor transformRequest applies grok-4.5 default reasoning effort", () => {
  const executor = new GrokCliExecutor();
  const out = executor.transformRequest(
    "grok-4.5",
    { input: [{ type: "message", role: "user", content: "hi" }] },
    false,
    {} as never
  ) as Record<string, unknown>;

  assert.deepEqual(out.reasoning, { effort: "high" });
});

test("GrokCliExecutor transformRequest removes reasoning for grok-composer-2.5-fast", () => {
  const executor = new GrokCliExecutor();
  const out = executor.transformRequest(
    "grok-composer-2.5-fast",
    { reasoning: { effort: "high" } },
    false,
    {} as never
  ) as Record<string, unknown>;

  assert.equal(out.reasoning, undefined);
});

test("GrokCliExecutor default model fallback is grok-composer-2.5-fast when body omits model", () => {
  const executor = new GrokCliExecutor();
  const out = executor.transformRequest(
    "",
    { input: [{ type: "message", role: "user", content: "hi" }] },
    false,
    {} as never
  ) as Record<string, unknown>;

  assert.equal(out.model, "grok-composer-2.5-fast");
});

// ---------------------------------------------------------------------------
// Local unknown-ID rejection vs mocked upstream 400 model-not-found
// ---------------------------------------------------------------------------

test("resolveModelOrError rejects grok-cli/grok-build locally before dispatch", async () => {
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("local unknown grok-cli model must not reach fetch");
  };

  try {
    const result = await resolveModelOrError(
      "grok-cli/grok-build",
      { messages: [{ role: "user", content: "hi" }] },
      "/v1/chat/completions"
    );

    assert.ok(result.error, "explicit grok-cli/grok-build must be a local 4xx");
    assert.equal(result.error.status, 400);
    assert.equal(fetchCalls, 0, "local rejection must not dispatch");

    const json = (await result.error.json()) as {
      error?: { message?: string; code?: string; type?: string };
    };
    const message = String(json.error?.message || "");
    assert.match(message, /grok-cli/);
    assert.match(message, /grok-build/);
    assert.equal(/oauth/i.test(message), false, "must not be labeled as an OAuth failure");
    assert.notEqual(json.error?.code, "oauth_error");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GrokCliExecutor.execute rejects unregistered grok-build before fetch", async () => {
  const executor = new GrokCliExecutor();
  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    throw new Error("unregistered grok-cli model must not reach fetch");
  };

  try {
    const result = await executor.execute({
      model: "grok-build",
      body: { input: [{ type: "message", role: "user", content: "hi" }] },
      stream: false,
      credentials: { accessToken: "sk-probe-access-token" } as never,
      log: { debug() {}, info() {}, warn() {}, error() {} } as never,
    });

    assert.equal(result.response.status, 400);
    assert.equal(fetchCalls, 0, "local executor rejection must not dispatch");
    const json = (await result.response.json()) as {
      error?: { message?: string; code?: string };
    };
    const message = String(json.error?.message || "");
    assert.match(message, /grok-cli/);
    assert.match(message, /grok-build/);
    assert.equal(/oauth/i.test(message), false);
    assert.equal(json.error?.code, "unknown_model");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("mocked upstream 400 model-not-found is a remote class distinct from local unknown-ID rejection", async () => {
  const executor = new GrokCliExecutor();
  const originalFetch = globalThis.fetch;
  let fetchCalls = 0;

  globalThis.fetch = async () => {
    fetchCalls += 1;
    return new Response(
      JSON.stringify({
        error: {
          message: "model not found",
          type: "invalid_request_error",
          code: "model_not_found",
        },
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  };

  try {
    const result = await executor.execute({
      model: "grok-4.5",
      body: { input: [{ type: "message", role: "user", content: "probe" }] },
      stream: false,
      credentials: { accessToken: "sk-probe-access-token" } as never,
      log: { debug() {}, info() {}, warn() {}, error() {} } as never,
    });

    assert.equal(fetchCalls, 1, "known registered model may reach mocked upstream");
    assert.equal(result.response.status, 400);
    const json = (await result.response.json()) as {
      error?: { message?: string; code?: string; type?: string };
    };
    const message = String(json.error?.message || "");
    assert.match(message, /grok-cli/);
    assert.match(message, /grok-4\.5/);
    assert.match(message, /model not found/i);
    assert.notEqual(json.error?.code, "unknown_model");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("client-facing remote 400 sanitizes token-shaped details at the executor boundary", async () => {
  const executor = new GrokCliExecutor();
  const originalFetch = globalThis.fetch;
  const leakedToken = "sk-must_not_leak_12345";

  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          message: `model not found while using ${leakedToken}`,
          type: "invalid_request_error",
          code: "model_not_found",
        },
      }),
      { status: 400, headers: { "content-type": "application/json" } }
    );
  };

  try {
    const result = await executor.execute({
      model: "grok-4.5",
      body: { input: [{ type: "message", role: "user", content: "probe" }] },
      stream: false,
      credentials: { accessToken: leakedToken } as never,
      log: { debug() {}, info() {}, warn() {}, error() {} } as never,
    });

    assert.equal(result.response.status, 400, "upstream HTTP status must be preserved");
    const text = await result.response.text();
    assert.equal(text.includes(leakedToken), false, "token-shaped details must not reach clients");
    assert.equal(
      sanitizeErrorMessageForResponse(`model not found while using ${leakedToken}`).includes(
        leakedToken
      ),
      false
    );
    assert.ok(text.includes("grok-cli"), "provider context must survive sanitization");
    assert.ok(text.includes("grok-4.5"), "model context must survive sanitization");
    assert.ok(/model not found/i.test(text), "remote model-unavailable class must survive");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// ---------------------------------------------------------------------------
// Provider/auth separation invariants
// ---------------------------------------------------------------------------

test("grok-cli registry requires OAuth and carries token refresh URL", () => {
  assert.equal(grok_cliProvider.authType, "oauth");
  assert.ok(
    typeof grok_cliProvider.oauth?.tokenUrl === "string" &&
      grok_cliProvider.oauth.tokenUrl.includes("oauth2/token")
  );
});

test("xai registry requires API key and has no OAuth config", () => {
  assert.equal(xaiProvider.authType, "apikey");
  assert.equal(xaiProvider.oauth, undefined);
});

test("grok-cli client version matches shared grokBuild constant", () => {
  assert.equal(grok_cliProvider.clientVersion, getGrokBuildClientVersion());
  assert.equal(grok_cliProvider.clientVersion, "0.2.106");
});

test("grok-cli passthroughModels is true; xai is not marked passthrough", () => {
  assert.equal(grok_cliProvider.passthroughModels, true);
  assert.equal(xaiProvider.passthroughModels, undefined);
});

// ---------------------------------------------------------------------------
// Default behavior summary
// ---------------------------------------------------------------------------

test("grok-cli default model fallback contract", () => {
  const executor = new GrokCliExecutor();
  const out = executor.transformRequest(
    undefined,
    { input: [{ type: "message", role: "user", content: "hi" }] },
    false,
    {} as never
  ) as Record<string, unknown>;

  assert.equal(out.model, "grok-composer-2.5-fast");
  assert.equal(out.store, false);
  assert.equal("reasoning" in out, false);
});
