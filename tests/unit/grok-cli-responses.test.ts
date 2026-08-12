import test from "node:test";
import assert from "node:assert/strict";

const { GrokCliExecutor } = await import("@omniroute/open-sse/executors/grok-cli");
const { grok_cliProvider } =
  await import("@omniroute/open-sse/config/providers/registry/grok-cli/index");
const { GROK_BUILD_RESPONSES_URL, GROK_BUILD_MODELS_URL, getGrokBuildClientVersion } =
  await import("@omniroute/open-sse/config/grokBuild");

test("GrokCliExecutor buildUrl targets /v1/responses", () => {
  const executor = new GrokCliExecutor();
  const url = executor.buildUrl("grok-4.5", true, 0, null);
  assert.equal(url, GROK_BUILD_RESPONSES_URL);
  assert.equal(url, "https://cli-chat-proxy.grok.com/v1/responses");
});

test("grok-cli provider registry contains updated models and metadata", () => {
  assert.equal(grok_cliProvider.modelsUrl, GROK_BUILD_MODELS_URL);
  assert.equal(grok_cliProvider.clientVersion, getGrokBuildClientVersion());
  assert.equal(grok_cliProvider.clientVersion, "0.2.106");

  const grok45 = grok_cliProvider.models.find((m) => m.id === "grok-4.5");
  assert.ok(grok45, "grok-4.5 model must be in registry");
  assert.equal(grok45.targetFormat, "openai-responses");
  assert.equal(grok45.supportsReasoning, true);
  assert.equal(grok45.contextLength, 500000);

  const composer = grok_cliProvider.models.find((m) => m.id === "grok-composer-2.5-fast");
  assert.ok(composer, "grok-composer-2.5-fast model must be in registry");
  assert.equal(composer.targetFormat, "openai-responses");
  assert.equal(composer.supportsReasoning, false);
});

test("GrokCliExecutor buildHeaders includes session headers without leaking credentials", () => {
  const executor = new GrokCliExecutor();
  const credentials = {
    accessToken: "test-access-token",
    email: "user@example.com",
    providerSpecificData: {
      userId: "usr_12345",
    },
  };

  const headers = executor.buildHeaders(credentials, true, null, "grok-4.5");
  assert.equal(headers["Authorization"], "Bearer test-access-token");
  assert.equal(headers["X-XAI-Token-Auth"], "xai-grok-cli");
  assert.equal(headers["x-grok-model-override"], "grok-4.5");
  assert.equal(headers["x-userid"], "usr_12345");
  assert.equal(headers["x-email"], "user@example.com");
  assert.equal(headers["Accept"], "text/event-stream");
});

test("GrokCliExecutor transformRequest normalizes reasoning and defaults", () => {
  const executor = new GrokCliExecutor();

  // Test grok-4.5 default reasoning effort
  const body45 = executor.transformRequest(
    "grok-4.5",
    { input: [{ type: "message", role: "user", content: "hello" }] },
    false,
    {} as never
  ) as Record<string, unknown>;

  assert.equal(body45.store, false);
  assert.deepEqual(body45.include, ["reasoning.encrypted_content"]);
  assert.deepEqual(body45.reasoning, { effort: "high" });

  // Test grok-composer-2.5-fast strips reasoning effort
  const bodyComposer = executor.transformRequest(
    "grok-composer-2.5-fast",
    { reasoning: { effort: "high" } },
    false,
    {} as never
  ) as Record<string, unknown>;

  assert.equal(bodyComposer.reasoning, undefined);
});

test("GrokCliExecutor transformRequest caps tools at 200", () => {
  const executor = new GrokCliExecutor();
  const tools = Array.from({ length: 250 }, (_, i) => ({
    type: "function",
    function: { name: `tool_${i}` },
  }));

  const body = executor.transformRequest("grok-4.5", { tools }, false, {} as never) as Record<
    string,
    unknown
  >;

  assert.ok(Array.isArray(body.tools));
  assert.equal((body.tools as unknown[]).length, 200);
  // The cap must keep the FIRST 200 tools, not an arbitrary slice.
  const firstTool = (body.tools as Array<Record<string, unknown>>)[0];
  assert.equal((firstTool.function as Record<string, unknown>).name, "tool_0");
});

test("GrokCliExecutor transformRequest preserves an explicit client reasoning effort", () => {
  const executor = new GrokCliExecutor();

  // Explicit values must NOT be silently replaced by the grok-4.5 default ("high").
  for (const effort of ["low", "medium", "high"]) {
    const body = executor.transformRequest(
      "grok-4.5",
      { reasoning: { effort } },
      false,
      {} as never
    ) as Record<string, unknown>;
    assert.deepEqual(body.reasoning, { effort }, `explicit effort "${effort}" must survive`);
  }

  // An unsupported effort is dropped rather than forwarded upstream.
  const unsupported = executor.transformRequest(
    "grok-4.5",
    { reasoning: { effort: "xhigh" } },
    false,
    {} as never
  ) as Record<string, unknown>;
  assert.equal(unsupported.reasoning, undefined);
});

test("GrokCliExecutor buildHeaders omits identity headers when data is absent", () => {
  const executor = new GrokCliExecutor();
  const headers = executor.buildHeaders(
    { accessToken: "tok" } as never,
    false,
    null,
    "grok-composer-2.5-fast"
  );

  // Absent identity must not become an empty-string header.
  assert.equal("x-userid" in headers, false);
  assert.equal("x-email" in headers, false);
  assert.equal(headers["Accept"], "application/json");
  assert.equal(headers["x-grok-model-override"], "grok-composer-2.5-fast");
});

test("GrokCliExecutor buildHeaders withholds email for team/organization principals", () => {
  const executor = new GrokCliExecutor();

  for (const principalType of ["team", "organization"]) {
    const headers = executor.buildHeaders(
      {
        accessToken: "tok",
        email: "user@example.com",
        providerSpecificData: { principalType },
      } as never,
      true,
      null,
      "grok-4.5"
    );
    assert.equal("x-email" in headers, false, `${principalType} principals must not send x-email`);
  }
});

test("GrokCliExecutor refreshCredentials never logs access or refresh tokens", async () => {
  const executor = new GrokCliExecutor();
  const refreshToken = "rt_SECRET_refresh_value_abcdef123456";
  const accessToken = "at_SECRET_access_value_zyxwvu987654";

  const lines: string[] = [];
  const log = {
    warn: (_tag: string, message: string) => lines.push(message),
    info: (_tag: string, message: string) => lines.push(message),
    debug: (_tag: string, message: string) => lines.push(message),
  };

  // Transport failures routinely echo the outgoing request (proxy/TLS/URL
  // errors), so the token can appear verbatim inside error.message.
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error(`connect ECONNREFUSED sending ${refreshToken} and ${accessToken}`);
  }) as typeof globalThis.fetch;

  try {
    const result = await executor.refreshCredentials(
      { refreshToken, accessToken } as never,
      log as never
    );
    assert.equal(result, null, "exhausted retries must resolve to null, not throw");
  } finally {
    globalThis.fetch = originalFetch;
  }

  const combined = lines.join("\n");
  assert.ok(lines.length > 0, "refresh failure should still be logged");
  assert.equal(combined.includes(refreshToken), false, "refresh token must never be logged");
  assert.equal(combined.includes(accessToken), false, "access token must never be logged");
  assert.ok(combined.includes("[REDACTED]"), "secret material should be redacted, not dropped");
});

test("GrokCliExecutor refreshCredentials returns null without a refresh token", async () => {
  const executor = new GrokCliExecutor();
  const result = await executor.refreshCredentials({ accessToken: "only-access" } as never, null);
  assert.equal(result, null);
});

test("GrokCliExecutor refreshCredentials stops immediately on a terminal invalid_grant", async () => {
  const executor = new GrokCliExecutor();
  let calls = 0;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    calls++;
    return new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400 });
  }) as typeof globalThis.fetch;

  try {
    const result = await executor.refreshCredentials({ refreshToken: "rt_x" } as never, null);
    assert.equal(result, null);
    // Terminal errors must not burn the full retry budget.
    assert.equal(calls, 1, "invalid_grant is terminal and must not be retried");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

const { handleChatCore } = await import("@omniroute/open-sse/handlers/chatCore");
const { getExecutor } = await import("@omniroute/open-sse/executors/index");

test("production-path end-to-end regression: OpenAI Chat input translates and dispatches to Grok Responses endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let dispatchedUrl = "";
  let dispatchedHeaders: Record<string, string> = {};
  let dispatchedBody: Record<string, unknown> = {};

  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    dispatchedUrl = String(url);
    const headersObj: Record<string, string> = {};
    if (init?.headers) {
      const hdrs = new Headers(init.headers);
      hdrs.forEach((val, key) => {
        headersObj[key] = val;
      });
    }
    dispatchedHeaders = headersObj;
    if (init?.body) {
      dispatchedBody = JSON.parse(String(init.body));
    }
    return new Response(
      JSON.stringify({
        id: "resp_123",
        object: "response",
        model: "grok-4.5",
        output: [
          {
            type: "message",
            id: "msg_123",
            role: "assistant",
            content: [{ type: "output_text", text: "Weather in Tokyo is sunny." }],
          },
        ],
      }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }) as typeof globalThis.fetch;

  try {
    const chatInput = {
      model: "grok-4.5",
      messages: [{ role: "user", content: "What is the weather in Tokyo?" }],
      tools: [
        {
          type: "function",
          function: {
            name: "get_weather",
            description: "Get weather",
            parameters: { type: "object", properties: { city: { type: "string" } } },
          },
        },
      ],
      stream: false,
    };

    await handleChatCore({
      body: structuredClone(chatInput),
      modelInfo: { provider: "grok-cli", model: "grok-4.5", extendedContext: false } as never,
      credentials: { accessToken: "test-token-grok-123", providerSpecificData: {} } as never,
      log: { debug() {}, info() {}, warn() {}, error() {} } as never,
      clientRawRequest: {
        endpoint: "/v1/chat/completions",
        body: structuredClone(chatInput),
        headers: new Headers({ accept: "application/json" }),
      } as never,
    });

    // Verify endpoint URL
    assert.equal(dispatchedUrl, GROK_BUILD_RESPONSES_URL);
    assert.equal(dispatchedUrl, "https://cli-chat-proxy.grok.com/v1/responses");

    // Verify headers
    assert.equal(dispatchedHeaders["authorization"], "Bearer test-token-grok-123");
    assert.equal(dispatchedHeaders["x-xai-token-auth"], "xai-grok-cli");
    assert.equal(dispatchedHeaders["x-grok-model-override"], "grok-4.5");

    // Verify body structure (OpenAI Responses shape with Grok defaults applied)
    assert.equal(dispatchedBody.model, "grok-4.5");
    assert.ok(
      Array.isArray(dispatchedBody.input),
      "dispatched body must carry input array for Responses API"
    );
    assert.ok(Array.isArray(dispatchedBody.tools), "dispatched body must carry tools array");
    assert.equal(dispatchedBody.store, false);
    assert.deepEqual(dispatchedBody.include, ["reasoning.encrypted_content"]);
    assert.deepEqual(dispatchedBody.reasoning, { effort: "high" });

    // Negative / wiring removal assertions:
    // 1) Verify executor mapping: getExecutor("grok-cli") returns GrokCliExecutor
    const executorInstance = getExecutor("grok-cli");
    assert.ok(
      executorInstance instanceof GrokCliExecutor,
      "grok-cli provider must resolve to GrokCliExecutor"
    );

    // 2) Verify that removing GrokCliExecutor would default to Chat Completions URL
    const defaultUrl = grok_cliProvider.baseUrl;
    assert.notEqual(
      GROK_BUILD_RESPONSES_URL,
      defaultUrl,
      "GrokCliExecutor buildUrl must override default Chat Completions baseUrl"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GrokCliExecutor.execute() abort signal propagation and cancellation semantics", async () => {
  const executor = new GrokCliExecutor();
  const controller = new AbortController();
  controller.abort(new Error("Test abort requested"));

  let fetchCalls = 0;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    fetchCalls++;
    if (init?.signal?.aborted) {
      const err = new Error("The operation was aborted");
      err.name = "AbortError";
      throw err;
    }
    throw new Error("unexpected call without aborted signal");
  }) as typeof globalThis.fetch;

  try {
    const credentials = {
      accessToken: "tok_test_secret_123",
      refreshToken: "rt_test_secret_456",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    await assert.rejects(
      async () => {
        await executor.execute({
          model: "grok-4.5",
          body: { input: [{ type: "message", role: "user", content: "hi" }] },
          stream: false,
          credentials: credentials as never,
          log: { debug() {}, info() {}, warn() {}, error() {} } as never,
          signal: controller.signal,
        });
      },
      (err: Error) => {
        assert.ok(err, "error must be thrown on abort");
        assert.ok(
          err.name === "AbortError" || err.message.toLowerCase().includes("abort"),
          "error must indicate abort or cancellation"
        );
        assert.equal(
          err.message.includes("tok_test_secret_123"),
          false,
          "access token must not leak on abort error"
        );
        assert.equal(
          err.message.includes("rt_test_secret_456"),
          false,
          "refresh token must not leak on abort error"
        );
        return true;
      }
    );
    assert.equal(
      fetchCalls,
      1,
      "aborted request must trigger single fetch dispatch with signal and not retry"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("GrokCliExecutor.execute() upstream HTTP 500 failure produces sanitized error handling", async () => {
  const executor = new GrokCliExecutor();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: {
          message: "Internal Grok Server Error at /var/app/internal/server.ts:123",
          type: "internal_error",
        },
      }),
      { status: 500, headers: { "content-type": "application/json" } }
    );
  }) as typeof globalThis.fetch;

  try {
    const credentials = {
      accessToken: "tok_test_access",
      refreshToken: "rt_test_refresh",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
    const { response } = await executor.execute({
      model: "grok-4.5",
      body: { input: [{ type: "message", role: "user", content: "hi" }] },
      stream: false,
      credentials: credentials as never,
      log: { debug() {}, info() {}, warn() {}, error() {} } as never,
    });

    assert.equal(response.status, 500, "upstream HTTP 500 status must be preserved");
    const bodyText = await response.text();
    assert.equal(
      bodyText.includes("tok_test_access"),
      false,
      "access token must not appear in error response"
    );
    assert.equal(
      bodyText.includes("rt_test_refresh"),
      false,
      "refresh token must not appear in error response"
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
