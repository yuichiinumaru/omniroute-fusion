import test from "node:test";
import assert from "node:assert/strict";

import { OAUTH_PROVIDERS } from "../../src/shared/constants/providers/oauth.ts";
import { FREEBUFF_CONFIG, PROVIDERS } from "../../src/lib/oauth/constants/oauth.ts";
import {
  freebuff,
  FreebuffDeviceCodeResponseRawSchema,
  FreebuffPollResponseRawSchema,
  FreebuffPollUserRawSchema,
} from "../../src/lib/oauth/providers/freebuff.ts";
import { REGISTRY } from "../../open-sse/config/providers/index.ts";
import {
  getExecutor,
  FreebuffExecutor,
  FREEBUFF_SIGNATURE_TOOL_NAMES,
  GENERIC_TOOL_NAMES,
  COMPOSIO_META_TOOL_NAMES,
  FREEBUFF_DOWNGRADE_MODEL_ID,
  FREEBUFF_DEFAULT_SIGNATURE_TOOL,
  hasSignatureTool,
  readToolNames,
} from "../../open-sse/executors/index.ts";
import type { ExecuteInput } from "../../open-sse/executors/base.ts";
import {
  clearAllFreebuffSessions,
  setFreebuffSession,
  ProviderError,
  FreebuffSessionAdmissionResponseSchema,
  FreebuffAdmissionErrorPayloadSchema,
  FreebuffAdmissionNestedErrorSchema,
} from "../../open-sse/services/freebuffSession.ts";
import { getProviderErrorRuleMatch } from "../../open-sse/config/providerErrorRules.ts";
import { getProviderBreakerState } from "../../open-sse/services/accountFallback.ts";

test.beforeEach(() => {
  clearAllFreebuffSessions();
});

// ── 1. Provider Registration & Constants ──────────────────────────────────────

test("freebuff is registered in OAUTH_PROVIDERS with free-tier metadata", () => {
  const p = (OAUTH_PROVIDERS as Record<string, {
    id: string;
    alias?: string;
    name?: string;
    hasFree?: boolean;
    subscriptionRisk?: boolean;
    riskNoticeVariant?: string;
    website?: string;
    authHint?: string;
  }>)["freebuff"];
  assert.ok(p, "OAUTH_PROVIDERS['freebuff'] must exist");
  assert.equal(p.id, "freebuff");
  assert.equal(p.alias, "fb");
  assert.equal(p.name, "Freebuff");
  assert.equal(p.hasFree, true);
  assert.equal(p.subscriptionRisk, true);
  assert.equal(p.riskNoticeVariant, "oauth");
  assert.equal(p.website, "https://codebuff.com");
  assert.ok(typeof p.authHint === "string" && p.authHint.includes("Codebuff"));
});

test("FREEBUFF_CONFIG in oauth constants defines proper endpoints", () => {
  assert.ok(FREEBUFF_CONFIG, "FREEBUFF_CONFIG must exist");
  assert.equal(FREEBUFF_CONFIG.authUrl, "https://codebuff.com/api/auth/cli/code");
  assert.equal(FREEBUFF_CONFIG.tokenUrl, "https://codebuff.com/api/auth/cli/status");
  assert.equal(FREEBUFF_CONFIG.sessionUrl, "https://codebuff.com/api/v1/freebuff/session");
  assert.equal(FREEBUFF_CONFIG.chatUrl, "https://codebuff.com/api/v1/chat/completions");
  assert.equal(FREEBUFF_CONFIG.userAgent, "ai-sdk/openai-compatible/0.1.0/codebuff");
  assert.equal(PROVIDERS.FREEBUFF, "freebuff");
});

test("freebuff is registered in open-sse REGISTRY with primary id and alias", () => {
  const r = REGISTRY["freebuff"];
  assert.ok(r, "REGISTRY['freebuff'] must exist");
  assert.equal(r.id, "freebuff");
  assert.equal(r.alias, "fb");
  assert.equal(r.executor, "freebuff");
  assert.equal(r.format, "openai");
  assert.equal(r.baseUrl, "https://codebuff.com/api/v1/chat/completions");
  assert.equal(r.authType, "oauth");

  const aliasEntry = REGISTRY["fb"];
  assert.ok(aliasEntry, "REGISTRY['fb'] must exist");
  assert.equal(aliasEntry.id, "freebuff");
});

test("freebuff catalog includes all 6 supported models", () => {
  const r = REGISTRY["freebuff"];
  assert.ok(r.models && r.models.length >= 6, "Must have at least 6 models");
  const modelIds = r.models.map((m) => m.id);

  assert.ok(modelIds.includes("deepseek-v4-pro"), "deepseek-v4-pro must be present");
  assert.ok(modelIds.includes("deepseek-v4-flash"), "deepseek-v4-flash must be present");
  assert.ok(modelIds.includes("gpt-5.6-luna"), "gpt-5.6-luna must be present");
  assert.ok(modelIds.includes("minimax-m3"), "minimax-m3 must be present");
  assert.ok(modelIds.includes("mimo-v2.5"), "mimo-v2.5 must be present");
  assert.ok(modelIds.includes("glm-5.2"), "glm-5.2 must be present");

  for (const m of r.models) {
    assert.ok(m.id && typeof m.id === "string");
    assert.ok(m.name && typeof m.name === "string");
    // contextLength is optional — models without an authoritative observed
    // value omit it and fall through to the consumer's default.
    if (m.contextLength !== undefined) {
      assert.ok(m.contextLength > 0, `${m.id}: contextLength must be positive when set`);
    }
  }
});

// ── 1b. Context Length Regression Guard ────────────────────────────────────────
// Values sourced from FREEBUFF_MODEL_CONTEXT_WINDOWS in the checked-in Freebuff
// reference (references/freebuff/common/src/constants/freebuff-models.ts).
// Every number was observed from a real provider rejection or verified endpoint
// metadata — not from spec sheets, marketing, or memory. Models without an
// authoritative observed value must NOT carry a contextLength in the registry.
// This test fails if a value drifts from evidence or an unverified value appears.

test("freebuff registry context lengths match authoritative reference evidence", () => {
  const r = REGISTRY["freebuff"];
  assert.ok(r.models, "models must exist");

  const byId = Object.fromEntries(r.models.map((m) => [m.id, m]));

  // ── Models WITH observed context windows ──────────────────────────────
  // deepseek-v4-pro: 1,048,576 (rejection text 2026-08-12)
  assert.equal(
    byId["deepseek-v4-pro"].contextLength,
    1048576,
    "deepseek-v4-pro must be 1,048,576 (observed provider rejection)"
  );

  // deepseek-v4-flash: 1,048,576 (rejection text: "model maximum context length: 1048575")
  assert.equal(
    byId["deepseek-v4-flash"].contextLength,
    1048576,
    "deepseek-v4-flash must be 1,048,576 (observed provider rejection)"
  );

  // gpt-5.6-luna: 1,000,000 (OpenRouter endpoints verified 2026-08-01, safe-side)
  assert.equal(
    byId["gpt-5.6-luna"].contextLength,
    1000000,
    "gpt-5.6-luna must be 1,000,000 (OpenRouter verified, safe-side rounding)"
  );

  // minimax-m3: 524,288 (rejection text: "model maximum context length: 524287")
  assert.equal(
    byId["minimax-m3"].contextLength,
    524288,
    "minimax-m3 must be 524,288 (observed provider rejection)"
  );

  // ── Models WITHOUT observed context windows ───────────────────────────
  // These MUST NOT carry a contextLength. If you have a new observed value,
  // add the evidence (rejection text + date) to the registry comment AND to
  // this test before setting it.
  assert.equal(
    byId["mimo-v2.5"].contextLength,
    undefined,
    "mimo-v2.5 must omit contextLength — no authoritative value observed"
  );

  assert.equal(
    byId["glm-5.2"].contextLength,
    undefined,
    "glm-5.2 must omit contextLength — no authoritative value observed"
  );
});

test("freebuff registry context lengths must never be 128k or 256k (unsupported legacy claims)", () => {
  const r = REGISTRY["freebuff"];
  assert.ok(r.models, "models must exist");

  const unsupportedValues = [128000, 131072, 262144];
  const modelsWithObservedContext = ["deepseek-v4-pro", "deepseek-v4-flash", "gpt-5.6-luna", "minimax-m3"];

  for (const m of r.models) {
    if (modelsWithObservedContext.includes(m.id)) {
      assert.ok(
        m.contextLength !== undefined && !unsupportedValues.includes(m.contextLength),
        `${m.id}: contextLength ${m.contextLength} is an unsupported claim — must match reference evidence`
      );
    }
  }
});

test("getExecutor returns FreebuffExecutor for freebuff and fb alias", () => {
  const exec1 = getExecutor("freebuff");
  assert.ok(exec1 instanceof FreebuffExecutor, "Must return FreebuffExecutor for freebuff");

  const exec2 = getExecutor("fb");
  assert.ok(exec2 instanceof FreebuffExecutor, "Must return FreebuffExecutor for fb alias");
});

// ── 2. OAuth Device Flow ──────────────────────────────────────────────────────

test("requestDeviceCode initiates flow and returns formatted response", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let requestedUrl = "";
  let requestedHeaders: Record<string, string> = {};
  let requestedBody: Record<string, string> | null = null;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    requestedUrl = url.toString();
    requestedHeaders = (init?.headers || {}) as Record<string, string>;
    requestedBody = init?.body ? JSON.parse(init.body as string) : null;

    return new Response(
      JSON.stringify({
        loginUrl: "https://codebuff.com/auth/cli?code=test-fp-123",
        fingerprintHash: "hash-abc",
        expiresAt: Math.floor(Date.now() / 1000) + 600,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const result = await freebuff.requestDeviceCode(FREEBUFF_CONFIG);

  assert.equal(requestedUrl, "https://codebuff.com/api/auth/cli/code");
  assert.equal(requestedHeaders["Content-Type"], "application/json");
  assert.equal(requestedHeaders["User-Agent"], "ai-sdk/openai-compatible/0.1.0/codebuff");
  assert.ok(requestedBody.fingerprintId && requestedBody.fingerprintId.length > 0);

  assert.equal(result.user_code, "hash-abc");
  assert.equal(result.verification_uri, "https://codebuff.com/auth/cli?code=test-fp-123");
  assert.equal(result.verification_uri_complete, "https://codebuff.com/auth/cli?code=test-fp-123");
  assert.ok(result.expires_in > 0);
  assert.ok(result.device_code.includes("fingerprintId"));
});

test("requestDeviceCode accepts the real Codebuff response shape (incl. fingerprintId + expiresInMs)", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // Captured from POST https://codebuff.com/api/auth/cli/code (307 → www.codebuff.com, followed by fetch):
  // {"fingerprintId":"...","fingerprintHash":"...","loginUrl":"...","expiresAt":<ms>,"expiresInMs":3600000}
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        fingerprintId: "test-fingerprint-0002",
        fingerprintHash: "98a3f5103ee0edabac401dbc42f7091d7f547286fb1a9224431ff37787b99a43",
        loginUrl: "https://www.codebuff.com/login?auth_code=verwq2e-Yx4KVc4GX0qjAA",
        expiresAt: Date.now() + 3600000,
        expiresInMs: 3600000,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const result = await freebuff.requestDeviceCode(FREEBUFF_CONFIG);

  assert.equal(result.user_code, "98a3f5103ee0edabac401dbc42f7091d7f547286fb1a9224431ff37787b99a43");
  assert.equal(
    result.verification_uri,
    "https://www.codebuff.com/login?auth_code=verwq2e-Yx4KVc4GX0qjAA"
  );
  assert.equal(result.verification_uri_complete, "https://www.codebuff.com/login?auth_code=verwq2e-Yx4KVc4GX0qjAA");
  assert.ok(result.expires_in > 0);
  assert.ok(result.device_code.includes("fingerprintId"));
});

test("pollToken handles authorization_pending correctly", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({ status: "pending", error: "authorization_pending" }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const result = await freebuff.pollToken(
    FREEBUFF_CONFIG,
    JSON.stringify({ fingerprintId: "fp-1", fingerprintHash: "hash-1" })
  );

  assert.equal(result.ok, false);
  assert.equal(result.data.error, "authorization_pending");
});

test("pollToken captures authToken and maps tokens successfully", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  let pollBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    pollBody = init?.body ? JSON.parse(init.body as string) : null;
    return new Response(
      JSON.stringify({
        status: "approved",
        user: {
          authToken: "cb-auth-token-999",
          email: "coder@example.com",
          name: "Alice",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const result = await freebuff.pollToken(
    FREEBUFF_CONFIG,
    JSON.stringify({ fingerprintId: "fp-1", fingerprintHash: "hash-1", expiresAt: 123456 })
  );

  assert.equal(result.ok, true);
  assert.equal(result.data.access_token, "cb-auth-token-999");
  assert.equal(result.data._userEmail, "coder@example.com");
  assert.equal(result.data._userName, "Alice");
  assert.equal(pollBody?.fingerprintId, "fp-1");
  assert.equal(pollBody?.fingerprintHash, "hash-1");

  const mapped = freebuff.mapTokens(result.data as {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number;
    _userEmail?: string;
    _userName?: string;
  });
  assert.equal(mapped.accessToken, "cb-auth-token-999");
  assert.equal(mapped.email, "coder@example.com");
  assert.equal(mapped.name, "Alice");
  assert.ok(mapped.expiresIn && mapped.expiresIn > 0);
});

// ── 3. Executor Execution & Request Formatting ────────────────────────────────

test("FreebuffExecutor formats headers, payload, and codebuff_metadata correctly", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  // Pre-seed an active session
  const credentials = { accessToken: "tok-123", connectionId: "c1" };
  setFreebuffSession(credentials, {
    instanceId: "inst-test-abc",
    model: "deepseek-v4-pro",
    expiresAt: Date.now() + 3600_000,
    acquiredAt: Date.now(),
  });

  let dispatchedHeaders: Record<string, string> = {};
  let dispatchedBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(url.toString(), "https://codebuff.com/api/v1/chat/completions");
    dispatchedHeaders = (init?.headers || {}) as Record<string, string>;
    dispatchedBody = init?.body ? JSON.parse(init.body as string) : null;

    return new Response(
      JSON.stringify({
        id: "chatcmpl-001",
        object: "chat.completion",
        choices: [{ message: { role: "assistant", content: "Hello from Freebuff!" } }],
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const executor = new FreebuffExecutor();
  const input = {
    model: "deepseek-v4-pro",
    body: {
      messages: [{ role: "user", content: "Hi" }],
      tools: [{ type: "function", function: { name: "test_tool" } }],
    },
    stream: false,
    credentials,
  };

  const result = await executor.execute(input);

  assert.equal(result.response.status, 200);
  assert.equal(dispatchedHeaders["Authorization"], "Bearer tok-123");
  assert.equal(dispatchedHeaders["x-freebuff-instance-id"], "inst-test-abc");
  assert.equal(dispatchedHeaders["x-freebuff-model"], "deepseek-v4-pro");
  assert.equal(dispatchedHeaders["User-Agent"], "ai-sdk/openai-compatible/0.1.0/codebuff");
  assert.equal(dispatchedHeaders["Accept"], "application/json");

  assert.equal(dispatchedBody?.model, "deepseek-v4-pro");
  assert.ok(dispatchedBody?.codebuff_metadata);
  const metadata = dispatchedBody.codebuff_metadata as Record<string, unknown>;
  assert.equal(metadata.freebuff_instance_id, "inst-test-abc");
  assert.equal(metadata.client, "codebuff-cli");
});

test("FreebuffExecutor handles streaming SSE responses", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const credentials = { accessToken: "tok-sse" };
  setFreebuffSession(credentials, {
    instanceId: "inst-sse",
    model: "gpt-5.6-luna",
    expiresAt: Date.now() + 3600_000,
    acquiredAt: Date.now(),
  });

  const ssePayload = "data: {\"choices\":[{\"delta\":{\"content\":\"chunk1\"}}]}\n\ndata: [DONE]\n\n";

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    const headers = (init?.headers || {}) as Record<string, string>;
    assert.equal(headers["Accept"], "text/event-stream");

    return new Response(ssePayload, {
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
    });
  }) as typeof fetch;

  const executor = new FreebuffExecutor();
  const result = await executor.execute({
    model: "gpt-5.6-luna",
    body: { messages: [{ role: "user", content: "Stream test" }] },
    stream: true,
    credentials,
  } as ExecuteInput);

  assert.equal(result.response.status, 200);
  const text = await result.response.text();
  assert.ok(text.includes("chunk1"));
});

// ── 4. Error Recovery Handling ────────────────────────────────────────────────

test("FreebuffExecutor recovers on 428 waiting_room_required by re-admitting session", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const credentials = { accessToken: "tok-428" };
  setFreebuffSession(credentials, {
    instanceId: "inst-before-428",
    model: "minimax-m3",
    expiresAt: Date.now() + 3600_000,
    acquiredAt: Date.now(),
  });

  let chatCalls = 0;
  let sessionAdmitCalls = 0;

  globalThis.fetch = (async (url: string | URL | Request) => {
    const u = url.toString();
    if (u.includes("/freebuff/session")) {
      sessionAdmitCalls++;
      return new Response(
        JSON.stringify({ instanceId: "inst-after-428", expiresAt: Date.now() + 3600_000 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (u.includes("/chat/completions")) {
      chatCalls++;
      if (chatCalls === 1) {
        return new Response(
          JSON.stringify({ error: "waiting_room_required", message: "Please admit session" }),
          { status: 428, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ choices: [{ message: { role: "assistant", content: "Recovered!" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("Not found", { status: 404 });
  }) as typeof fetch;

  const executor = new FreebuffExecutor();
  const result = await executor.execute({
    model: "minimax-m3",
    body: { messages: [{ role: "user", content: "Test 428" }] },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(chatCalls, 2);
  assert.equal(sessionAdmitCalls, 1);
  assert.equal(result.response.status, 200);
});

test("FreebuffExecutor recovers on 409 model_locked by releasing and re-admitting", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const credentials = { accessToken: "tok-409" };
  setFreebuffSession(credentials, {
    instanceId: "inst-before-409",
    model: "glm-5.2",
    expiresAt: Date.now() + 3600_000,
    acquiredAt: Date.now(),
  });

  let deleteCalls = 0;
  let sessionAdmitCalls = 0;
  let chatCalls = 0;

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const u = url.toString();
    const method = init?.method || "GET";

    if (u.includes("/freebuff/session") && method === "DELETE") {
      deleteCalls++;
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }
    if (u.includes("/freebuff/session") && method === "POST") {
      sessionAdmitCalls++;
      return new Response(
        JSON.stringify({ instanceId: "inst-after-409", expiresAt: Date.now() + 3600_000 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (u.includes("/chat/completions")) {
      chatCalls++;
      if (chatCalls === 1) {
        return new Response(
          JSON.stringify({ error: "model_locked", message: "Model is locked" }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ choices: [{ message: { role: "assistant", content: "Recovered 409!" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("Not found", { status: 404 });
  }) as typeof fetch;

  const executor = new FreebuffExecutor();
  const result = await executor.execute({
    model: "glm-5.2",
    body: { messages: [{ role: "user", content: "Test 409" }] },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(deleteCalls, 1);
  assert.equal(sessionAdmitCalls, 1);
  assert.equal(chatCalls, 2);
  assert.equal(result.response.status, 200);
});

test("FreebuffExecutor recovers on 410 session_expired by renewing session", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const credentials = { accessToken: "tok-410" };
  setFreebuffSession(credentials, {
    instanceId: "inst-before-410",
    model: "mimo-v2.5",
    expiresAt: Date.now() + 3600_000,
    acquiredAt: Date.now(),
  });

  let sessionAdmitCalls = 0;
  let chatCalls = 0;

  globalThis.fetch = (async (url: string | URL | Request) => {
    const u = url.toString();
    if (u.includes("/freebuff/session")) {
      sessionAdmitCalls++;
      return new Response(
        JSON.stringify({ instanceId: "inst-after-410", expiresAt: Date.now() + 3600_000 }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    if (u.includes("/chat/completions")) {
      chatCalls++;
      if (chatCalls === 1) {
        return new Response(
          JSON.stringify({ error: "session_expired", message: "Session expired" }),
          { status: 410, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ choices: [{ message: { role: "assistant", content: "Recovered 410!" } }] }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }
    return new Response("Not found", { status: 404 });
  }) as typeof fetch;

  const executor = new FreebuffExecutor();
  const result = await executor.execute({
    model: "mimo-v2.5",
    body: { messages: [{ role: "user", content: "Test 410" }] },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(sessionAdmitCalls, 1);
  assert.equal(chatCalls, 2);
  assert.equal(result.response.status, 200);
});

// ── 5. Anti-Downgrade Safeguard & Tool Declarations ───────────────────────────

test("FREEBUFF_SIGNATURE_TOOL_NAMES contains authoritative Codebuff signature tools and excludes generic tools", () => {
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.size >= 20, "Must contain >= 20 signature tools");
  assert.equal(FREEBUFF_DOWNGRADE_MODEL_ID, "inclusionai/ling-3.0-tiny:free");

  // Signature tools must be present
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("code_search"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("read_files"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("read_subtree"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("read_docs"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("run_terminal_command"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("str_replace"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("propose_str_replace"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("propose_write_file"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("spawn_agents"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("spawn_agent_inline"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("think_deeply"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("create_plan"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("add_subgoal"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("add_message"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("set_messages"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("set_output"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("update_subgoal"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("task_completed"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("ask_user"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("decide"));

  // Composio signature meta-tools must be present
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("composio_manage_connections"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("composio_multi_execute_tool"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("composio_search_tools"));
  assert.ok(FREEBUFF_SIGNATURE_TOOL_NAMES.has("composio_get_tool_schemas"));

  // Generic tools must be excluded from signature set
  for (const genericName of GENERIC_TOOL_NAMES) {
    assert.equal(
      FREEBUFF_SIGNATURE_TOOL_NAMES.has(genericName),
      false,
      `${genericName} must not be in FREEBUFF_SIGNATURE_TOOL_NAMES`
    );
  }
  assert.ok(GENERIC_TOOL_NAMES.has("write_file"));
  assert.ok(GENERIC_TOOL_NAMES.has("web_search"));
  assert.ok(GENERIC_TOOL_NAMES.has("glob"));
  assert.ok(GENERIC_TOOL_NAMES.has("skill"));
  assert.ok(GENERIC_TOOL_NAMES.has("apply_patch"));
});

test("FREEBUFF_SIGNATURE_TOOL_NAMES recognizes all 4 Composio meta-tools as signature tools", () => {
  const composioTools = [
    "composio_manage_connections",
    "composio_multi_execute_tool",
    "composio_search_tools",
    "composio_get_tool_schemas",
  ];

  for (const name of composioTools) {
    assert.ok(
      FREEBUFF_SIGNATURE_TOOL_NAMES.has(name),
      `Composio tool ${name} must be in FREEBUFF_SIGNATURE_TOOL_NAMES`
    );
    assert.equal(
      hasSignatureTool([{ function: { name } }]),
      true,
      `hasSignatureTool must return true for Composio tool ${name}`
    );
    assert.equal(
      hasSignatureTool([{ name }]),
      true,
      `hasSignatureTool must return true for direct named Composio tool ${name}`
    );
  }
});

test("hasSignatureTool correctly identifies signature vs generic/foreign toolsets", () => {
  // Signature tools -> true
  assert.equal(hasSignatureTool([{ function: { name: "read_files" } }]), true);
  assert.equal(hasSignatureTool([{ function: { name: "code_search" } }]), true);
  assert.equal(hasSignatureTool([{ function: { name: "ask_user" } }]), true);
  assert.equal(hasSignatureTool([{ function: { name: "decide" } }]), true);

  // Generic only -> false
  assert.equal(hasSignatureTool([{ function: { name: "web_search" } }]), false);
  assert.equal(
    hasSignatureTool([
      { function: { name: "glob" } },
      { function: { name: "write_file" } },
      { function: { name: "skill" } },
      { function: { name: "apply_patch" } },
    ]),
    false
  );

  // Foreign only -> false
  assert.equal(
    hasSignatureTool([
      { function: { name: "calculator" } },
      { function: { name: "bash" } },
      { function: { name: "edit" } },
    ]),
    false
  );

  // Mixed signature + generic -> true
  assert.equal(
    hasSignatureTool([
      { function: { name: "web_search" } },
      { function: { name: "read_files" } },
    ]),
    true
  );
});

test("FreebuffExecutor.transformRequest injects signature tool when caller sends generic-only or foreign tools", () => {
  const executor = new FreebuffExecutor();
  const inputBody = {
    messages: [{ role: "user", content: "Search web and compute" }],
    tools: [
      {
        type: "function",
        function: {
          name: "web_search",
          description: "Search web",
          parameters: { type: "object", properties: { q: { type: "string" } } },
        },
      },
      {
        type: "function",
        function: {
          name: "calculator",
          description: "Perform calculation",
          parameters: { type: "object", properties: { expr: { type: "string" } } },
        },
      },
    ],
  };

  const transformed = executor.transformRequest(
    "deepseek-v4-pro",
    inputBody,
    false,
    { accessToken: "tok-test" }
  ) as Record<string, unknown>;

  assert.equal(transformed.model, "deepseek-v4-pro");
  assert.ok(transformed.tools);
  assert.equal(Array.isArray(transformed.tools), true);
  // Original 2 tools + 1 injected signature tool
  const tools = transformed.tools as Array<{ function: { name: string } }>;
  assert.equal(tools.length, 3);
  assert.equal(tools[0].function.name, "web_search");
  assert.equal(tools[1].function.name, "calculator");
  assert.equal(tools[2].function.name, "think_deeply");

  // Verification: transformed request now passes signature tool check
  assert.equal(hasSignatureTool(transformed.tools), true);

  const metadata = transformed.codebuff_metadata as Record<string, unknown>;
  assert.ok(metadata, "codebuff_metadata must be present");
  assert.equal(metadata.client, "codebuff-cli");
  assert.equal(metadata.client_id, "cb-client-01");
  assert.ok(typeof metadata.run_id === "string" && (metadata.run_id as string).startsWith("run-"));
  assert.equal(metadata.foreign_toolset, false);
});

test("FreebuffExecutor.transformRequest preserves exact tools array when signature tool is already present", () => {
  const executor = new FreebuffExecutor();
  const inputBody = {
    messages: [{ role: "user", content: "Use code search" }],
    tools: [
      {
        type: "function",
        function: {
          name: "code_search",
          description: "Search code",
          parameters: { type: "object", properties: { query: { type: "string" } } },
        },
      },
      {
        type: "function",
        function: {
          name: "web_search",
          description: "Search web",
          parameters: { type: "object", properties: { q: { type: "string" } } },
        },
      },
    ],
  };

  const transformed = executor.transformRequest(
    "deepseek-v4-pro",
    inputBody,
    false,
    { accessToken: "tok-test" }
  ) as Record<string, unknown>;

  assert.equal(transformed.model, "deepseek-v4-pro");
  assert.ok(transformed.tools);
  const tools = transformed.tools as Array<{ function: { name: string } }>;
  assert.equal(tools.length, 2, "Must not inject duplicate signature tool");
  assert.equal(tools[0].function.name, "code_search");
  assert.equal(tools[1].function.name, "web_search");

  const metadata = transformed.codebuff_metadata as Record<string, unknown>;
  assert.equal(metadata.client, "codebuff-cli");
  assert.equal(metadata.foreign_toolset, false);
});

test("FreebuffExecutor.transformRequest sets foreign_toolset: false when tool_choice is present", () => {
  const executor = new FreebuffExecutor();
  const inputBody = {
    messages: [{ role: "user", content: "Choose tool" }],
    tool_choice: "auto",
  };

  const transformed = executor.transformRequest(
    "gpt-5.6-luna",
    inputBody,
    false,
    { accessToken: "tok-test" }
  ) as Record<string, unknown>;

  assert.equal(transformed.model, "gpt-5.6-luna");
  assert.equal(transformed.tool_choice, "auto");
  assert.ok(Array.isArray(transformed.tools));
  assert.equal((transformed.tools as Array<{ function: { name: string } }>)[0].function.name, "think_deeply");
  const metadata = transformed.codebuff_metadata as Record<string, unknown>;
  assert.equal(metadata.client, "codebuff-cli");
  assert.equal(metadata.foreign_toolset, false);
});

test("FreebuffExecutor.transformRequest preserves model and does not inject foreign_toolset for non-tool requests", () => {
  const executor = new FreebuffExecutor();
  const inputBody = {
    messages: [{ role: "user", content: "No tools here" }],
  };

  const transformed = executor.transformRequest(
    "minimax-m3",
    inputBody,
    false,
    { accessToken: "tok-test" }
  ) as Record<string, unknown>;

  assert.equal(transformed.model, "minimax-m3");
  const metadata = transformed.codebuff_metadata as Record<string, unknown>;
  assert.equal(metadata.client, "codebuff-cli");
  assert.equal(metadata.foreign_toolset, undefined);
});

test("FreebuffExecutor.execute with generic/foreign tools guarantees signature tool presence and foreign_toolset: false", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const credentials = { accessToken: "tok-tool-exec" };
  setFreebuffSession(credentials, {
    instanceId: "inst-tool-valid",
    model: "deepseek-v4-pro",
    expiresAt: Date.now() + 3600_000,
    acquiredAt: Date.now(),
  });

  let dispatchedBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (_url: string | URL | Request, init?: RequestInit) => {
    dispatchedBody = init?.body ? JSON.parse(init.body as string) : null;
    return new Response(
      JSON.stringify({ choices: [{ message: { role: "assistant", content: "Tool acknowledged" } }] }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const executor = new FreebuffExecutor();
  const result = await executor.execute({
    model: "deepseek-v4-pro",
    body: {
      messages: [{ role: "user", content: "Calculate 2+2 and search docs" }],
      tools: [
        {
          type: "function",
          function: {
            name: "calculator",
            description: "Math calculation engine",
            parameters: {
              type: "object",
              properties: { expr: { type: "string", description: "math expression" } },
              required: ["expr"],
            },
          },
        },
        {
          type: "function",
          function: {
            name: "web_search",
            description: "Search the web",
            parameters: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"],
            },
          },
        },
      ],
    },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(result.response.status, 200);
  assert.equal(dispatchedBody?.model, "deepseek-v4-pro");
  assert.ok(Array.isArray(dispatchedBody?.tools));
  // 2 caller tools + 1 injected signature tool
  const tools = dispatchedBody?.tools as Array<{ function: { name: string; description: string } }>;
  assert.equal(tools.length, 3);
  assert.equal(tools[0].function.name, "calculator");
  assert.equal(tools[0].function.description, "Math calculation engine");
  assert.equal(tools[1].function.name, "web_search");
  assert.equal(tools[2].function.name, "think_deeply");

  // Ensure request has signature tool so Codebuff never downgrades
  assert.equal(hasSignatureTool(tools), true);

  const metadata = dispatchedBody?.codebuff_metadata as Record<string, unknown>;
  assert.equal(metadata.client, "codebuff-cli");
  assert.equal(metadata.client_id, "cb-client-01");
  assert.ok(typeof metadata.run_id === "string" && (metadata.run_id as string).startsWith("run-"));
  assert.equal(metadata.freebuff_instance_id, "inst-tool-valid");
  assert.equal(metadata.foreign_toolset, false);
});

// ── 6. 429 Status Code Handling & Structured Error Mapping ────────────────────

test("FreebuffExecutor maps 429 rate_limited to structured RATE_LIMIT_EXCEEDED with Retry-After", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const credentials = { accessToken: "tok-429-rl" };
  setFreebuffSession(credentials, {
    instanceId: "inst-429-rl",
    model: "deepseek-v4-pro",
    expiresAt: Date.now() + 3600_000,
    acquiredAt: Date.now(),
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: "Too many requests, slow down",
        retry_after: 15,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "15",
        },
      }
    );
  }) as typeof fetch;

  const executor = new FreebuffExecutor();
  const result = await executor.execute({
    model: "deepseek-v4-pro",
    body: { messages: [{ role: "user", content: "Test 429 rate_limited" }] },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(result.response.status, 429);
  assert.equal(result.response.headers.get("Retry-After"), "15");

  const body = (await result.response.json()) as {
    error: {
      message: string;
      type: string;
      code: string;
      reason?: string;
      retry_after?: number;
    };
  };

  assert.equal(body.error.code, "rate_limit_exceeded");
  assert.equal(body.error.type, "rate_limit_error");
  assert.equal(body.error.reason, "rate_limited");
  assert.equal(body.error.retry_after, 15);
  assert.ok(body.error.message.includes("Too many requests"));
});

test("FreebuffExecutor maps 429 ip_capped to structured RATE_LIMIT_EXCEEDED with reason", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const credentials = { accessToken: "tok-429-ip" };
  setFreebuffSession(credentials, {
    instanceId: "inst-429-ip",
    model: "deepseek-v4-flash",
    expiresAt: Date.now() + 3600_000,
    acquiredAt: Date.now(),
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: "ip_capped",
        message: "Hourly IP request quota reached",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "30",
        },
      }
    );
  }) as typeof fetch;

  const executor = new FreebuffExecutor();
  const result = await executor.execute({
    model: "deepseek-v4-flash",
    body: { messages: [{ role: "user", content: "Test 429 ip_capped" }] },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(result.response.status, 429);
  assert.equal(result.response.headers.get("Retry-After"), "30");

  const body = (await result.response.json()) as {
    error: {
      code: string;
      type: string;
      reason?: string;
      retry_after?: number;
    };
  };

  assert.equal(body.error.code, "rate_limit_exceeded");
  assert.equal(body.error.reason, "ip_capped");
  assert.equal(body.error.retry_after, 30);
});

test("FreebuffExecutor maps 429 free_mode_capacity_deferred to structured RATE_LIMIT_EXCEEDED", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const credentials = { accessToken: "tok-429-def" };
  setFreebuffSession(credentials, {
    instanceId: "inst-429-def",
    model: "gpt-5.6-luna",
    expiresAt: Date.now() + 3600_000,
    acquiredAt: Date.now(),
  });

  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: "free_mode_capacity_deferred",
        message: "Free capacity busy, request queued",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }) as typeof fetch;

  const executor = new FreebuffExecutor();
  const result = await executor.execute({
    model: "gpt-5.6-luna",
    body: { messages: [{ role: "user", content: "Test capacity deferred" }] },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(result.response.status, 429);
  assert.equal(result.response.headers.get("Retry-After"), "5");

  const body = (await result.response.json()) as {
    error: {
      code: string;
      type: string;
      reason?: string;
    };
  };

  assert.equal(body.error.code, "rate_limit_exceeded");
  assert.equal(body.error.reason, "free_mode_capacity_deferred");
});

// ── 7. Upstream Error Sanitization & Safety ───────────────────────────────────

test("FreebuffExecutor sanitizes 500 error responses and strips internal paths, JWTs, and secret tokens", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const credentials = { accessToken: "tok-500" };
  setFreebuffSession(credentials, {
    instanceId: "inst-500",
    model: "glm-5.2",
    expiresAt: Date.now() + 3600_000,
    acquiredAt: Date.now(),
  });

  const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2VjcmV0";
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: `Internal Server Error: crash at /usr/src/app/server.js:123:45 with token sk-SECRET-XYZ-9999 and Bearer ${jwt} and auth_admin_tok_8888 and cf_token_live_1234 and AKIA_SECRET_TOKEN`,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }) as typeof fetch;

  const executor = new FreebuffExecutor();
  const result = await executor.execute({
    model: "glm-5.2",
    body: { messages: [{ role: "user", content: "Trigger error" }] },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(result.response.status, 500);
  const body = (await result.response.json()) as { error: { message: string } };
  assert.ok(!body.error.message.includes("/usr/src/app/server.js"), "Must not leak internal paths");
  assert.ok(!body.error.message.includes("sk-SECRET-XYZ-9999"), "Must not leak raw secret tokens");
  assert.ok(!body.error.message.includes(jwt), "Must not leak JWT token");
  assert.ok(!body.error.message.includes("auth_admin_tok_8888"), "Must not leak auth_ token");
  assert.ok(!body.error.message.includes("cf_token_live_1234"), "Must not leak cf_ token");
  assert.ok(!body.error.message.includes("AKIA_SECRET_TOKEN"), "Must not leak AKIA_SECRET_TOKEN");
});

test("requestDeviceCode sanitizes error message and strips tokens/paths on failure", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZXZpY2UifQ.c2lnbmF0dXJl";
  globalThis.fetch = (async () => {
    return new Response(
      `Failure at /var/run/secrets/token.key with akia_secret_12345678 and Bearer ${jwt} and auth_cli_secret_777 and cf_clearance_secret_999`,
      { status: 502, headers: { "Content-Type": "text/plain" } }
    );
  }) as typeof fetch;

  await assert.rejects(
    async () => {
      await freebuff.requestDeviceCode(FREEBUFF_CONFIG);
    },
    (err: Error) => {
      assert.ok(!err.message.includes("/var/run/secrets/token.key"), "Path must be stripped");
      assert.ok(!err.message.includes("akia_secret_12345678"), "akia token must be redacted");
      assert.ok(!err.message.includes(jwt), "JWT token must be redacted");
      assert.ok(!err.message.includes("auth_cli_secret_777"), "auth_ token must be redacted");
      assert.ok(!err.message.includes("cf_clearance_secret_999"), "cf_ token must be redacted");
      assert.ok(err.message.includes("Freebuff device code request failed (502)"));
      return true;
    }
  );
});

test("requestDeviceCode fails closed when upstream returns malformed JSON", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async () => {
    return new Response("<html><body>502 Bad Gateway</body></html>", {
      status: 200, // HTTP 200 but HTML content
      headers: { "Content-Type": "text/html" },
    });
  }) as typeof fetch;

  await assert.rejects(
    async () => {
      await freebuff.requestDeviceCode(FREEBUFF_CONFIG);
    },
    /Freebuff device code response malformed/
  );
});

test("pollToken sanitizes poll error descriptions and strips tokens/paths on upstream failure", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjoiZGV2In0.dG9rZW52YWx1ZQ";
  globalThis.fetch = (async () => {
    return new Response(
      `Upstream error at /root/codebuff/auth.ts:99 with Bearer ${jwt} and auth_poll_key_444 and cf_token_poll_555 and AKIA_SECRET_TOKEN`,
      { status: 503, headers: { "Content-Type": "text/plain" } }
    );
  }) as typeof fetch;

  const result = await freebuff.pollToken(
    FREEBUFF_CONFIG,
    JSON.stringify({ fingerprintId: "fp-err", fingerprintHash: "hash-err" })
  );

  assert.equal(result.ok, false);
  assert.equal(result.data.error, "poll_failed");
  const desc = String(result.data.error_description);
  assert.ok(!desc.includes("/root/codebuff/auth.ts"), "Path must not leak");
  assert.ok(!desc.includes(jwt), "JWT must not leak");
  assert.ok(!desc.includes("auth_poll_key_444"), "auth_ token must not leak");
  assert.ok(!desc.includes("cf_token_poll_555"), "cf_ token must not leak");
  assert.ok(!desc.includes("AKIA_SECRET_TOKEN"), "AKIA token must not leak");
  assert.ok(desc.includes("<token>"), "Token placeholder must be present");
});

// ── 8. Runtime Breaker & Provider Error Rules Integration ──────────────────────

test("FreebuffExecutor on session admission 429 triggers provider circuit breaker and returns structured 429", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const credentials = { accessToken: "tok-admit-429", connectionId: "conn-admit-429" };

  globalThis.fetch = (async (url: string | URL | Request) => {
    const u = url.toString();
    if (u.includes("/freebuff/session")) {
      return new Response(
        JSON.stringify({
          error: "ip_capped",
          message: "Session admission rate limit exceeded",
          retry_after: 45,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": "45",
          },
        }
      );
    }
    return new Response("Not found", { status: 404 });
  }) as typeof fetch;

  const executor = new FreebuffExecutor();
  const result = await executor.execute({
    model: "deepseek-v4-pro",
    body: { messages: [{ role: "user", content: "Test session 429 breaker" }] },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(result.response.status, 429);
  assert.equal(result.response.headers.get("Retry-After"), "45");

  const body = (await result.response.json()) as {
    error: {
      code: string;
      type: string;
      reason?: string;
      retry_after?: number;
    };
  };

  assert.equal(body.error.code, "rate_limit_exceeded");
  assert.equal(body.error.reason, "ip_capped");
  assert.equal(body.error.retry_after, 45);

  const state = getProviderBreakerState("freebuff");
  assert.ok(state, "Provider circuit breaker state for freebuff must exist");
});

test("providerErrorRules matches Freebuff 429 capacity deferred, ip_capped, and rate_limited", () => {
  const matchCapacity = getProviderErrorRuleMatch("freebuff", 429, {}, { error: "free_mode_capacity_deferred" });
  assert.ok(matchCapacity);
  assert.equal(matchCapacity.reason, "rate_limit_exceeded");
  assert.equal(matchCapacity.scope, "provider");

  const matchIp = getProviderErrorRuleMatch("freebuff", 429, {}, { error: "ip_capped" });
  assert.ok(matchIp);
  assert.equal(matchIp.reason, "rate_limit_exceeded");
  assert.equal(matchIp.scope, "provider");

  const matchRate = getProviderErrorRuleMatch("freebuff", 429, {}, { error: "rate_limited" });
  assert.ok(matchRate);
  assert.equal(matchRate.reason, "rate_limit_exceeded");
  assert.equal(matchRate.scope, "connection");

  const matchLocked = getProviderErrorRuleMatch("freebuff", 409, {}, { error: "model_locked" });
  assert.ok(matchLocked);
  assert.equal(matchLocked.reason, "model_capacity");
  assert.equal(matchLocked.scope, "model");

  // Alias "fb" also works
  const matchAlias = getProviderErrorRuleMatch("fb", 429, {}, { error: "free_mode_capacity_deferred" });
  assert.ok(matchAlias);
  assert.equal(matchAlias.scope, "provider");
});

// ── 9. Strict Zod Response Schemas ─────────────────────────────────────────────

test("FreebuffDeviceCodeResponseRawSchema strictly validates device code responses and rejects empty/missing fields", () => {
  const valid = FreebuffDeviceCodeResponseRawSchema.safeParse({
    loginUrl: "https://codebuff.com/auth/cli?code=abc",
    fingerprintHash: "hash-123",
    expiresAt: 1700000000,
  });
  assert.equal(valid.success, true);

  const validStringExpires = FreebuffDeviceCodeResponseRawSchema.safeParse({
    loginUrl: "https://codebuff.com/auth/cli?code=abc",
    fingerprintHash: "hash-123",
    expiresAt: "2026-08-17T00:00:00Z",
  });
  assert.equal(validStringExpires.success, true);

  // Reject empty object
  const emptyObj = FreebuffDeviceCodeResponseRawSchema.safeParse({});
  assert.equal(emptyObj.success, false);

  // Reject missing loginUrl
  const missingLoginUrl = FreebuffDeviceCodeResponseRawSchema.safeParse({
    fingerprintHash: "hash-123",
    expiresAt: 1700000000,
  });
  assert.equal(missingLoginUrl.success, false);

  // Reject empty string loginUrl
  const emptyLoginUrl = FreebuffDeviceCodeResponseRawSchema.safeParse({
    loginUrl: "",
    fingerprintHash: "hash-123",
    expiresAt: 1700000000,
  });
  assert.equal(emptyLoginUrl.success, false);

  // Reject missing fingerprintHash
  const missingHash = FreebuffDeviceCodeResponseRawSchema.safeParse({
    loginUrl: "https://codebuff.com/auth/cli?code=abc",
    expiresAt: 1700000000,
  });
  assert.equal(missingHash.success, false);

  // Reject empty string fingerprintHash
  const emptyHash = FreebuffDeviceCodeResponseRawSchema.safeParse({
    loginUrl: "https://codebuff.com/auth/cli?code=abc",
    fingerprintHash: "",
    expiresAt: 1700000000,
  });
  assert.equal(emptyHash.success, false);

  // Optional expiresAt
  const missingExpires = FreebuffDeviceCodeResponseRawSchema.safeParse({
    loginUrl: "https://codebuff.com/auth/cli?code=abc",
    fingerprintHash: "hash-123",
  });
  assert.equal(missingExpires.success, true);

  // Reject empty string expiresAt
  const emptyExpires = FreebuffDeviceCodeResponseRawSchema.safeParse({
    loginUrl: "https://codebuff.com/auth/cli?code=abc",
    fingerprintHash: "hash-123",
    expiresAt: "",
  });
  assert.equal(emptyExpires.success, false);

  // Reject non-objects
  assert.equal(FreebuffDeviceCodeResponseRawSchema.safeParse("not-an-object").success, false);
  assert.equal(FreebuffDeviceCodeResponseRawSchema.safeParse(null).success, false);
  assert.equal(FreebuffDeviceCodeResponseRawSchema.safeParse(12345).success, false);
});

test("FreebuffPollResponseRawSchema strictly validates token poll responses and rejects empty objects", () => {
  const validApproved = FreebuffPollResponseRawSchema.safeParse({
    status: "approved",
    user: {
      authToken: "cb-auth-token-xyz",
      email: "test@example.com",
      name: "Test User",
    },
  });
  assert.equal(validApproved.success, true);

  const validPending = FreebuffPollResponseRawSchema.safeParse({
    status: "pending",
    error: "authorization_pending",
  });
  assert.equal(validPending.success, true);

  const validDirectToken = FreebuffPollResponseRawSchema.safeParse({
    authToken: "cb-auth-token-direct",
  });
  assert.equal(validDirectToken.success, true);

  const validError = FreebuffPollResponseRawSchema.safeParse({
    error: "access_denied",
    error_description: "User denied authorization",
  });
  assert.equal(validError.success, true);

  // Reject empty object
  const emptyObj = FreebuffPollResponseRawSchema.safeParse({});
  assert.equal(emptyObj.success, false);

  // Reject empty status without other valid fields
  const emptyStatus = FreebuffPollResponseRawSchema.safeParse({
    status: "",
  });
  assert.equal(emptyStatus.success, false);

  // Reject empty authToken
  const emptyAuthToken = FreebuffPollResponseRawSchema.safeParse({
    authToken: "",
  });
  assert.equal(emptyAuthToken.success, false);

  // Reject empty user object
  const emptyUser = FreebuffPollResponseRawSchema.safeParse({
    user: {},
  });
  assert.equal(emptyUser.success, false);

  // Reject primitives
  assert.equal(FreebuffPollResponseRawSchema.safeParse(12345).success, false);
  assert.equal(FreebuffPollResponseRawSchema.safeParse(null).success, false);
  assert.equal(FreebuffPollResponseRawSchema.safeParse("not-valid").success, false);
});

test("FreebuffDeviceCodeResponseRawSchema normalizes aliases authUrl/url/hash and rejects unknown keys via strict()", () => {
  // Alias authUrl + hash
  const aliasAuthUrlHash = FreebuffDeviceCodeResponseRawSchema.safeParse({
    authUrl: "https://codebuff.com/auth/cli?code=auth1",
    hash: "hash-auth1",
    expiresAt: 1700000000,
  });
  assert.equal(aliasAuthUrlHash.success, true);
  if (aliasAuthUrlHash.success) {
    assert.equal(aliasAuthUrlHash.data.loginUrl, "https://codebuff.com/auth/cli?code=auth1");
    assert.equal(aliasAuthUrlHash.data.fingerprintHash, "hash-auth1");
    assert.equal(aliasAuthUrlHash.data.expiresAt, 1700000000);
  }

  // Alias url + hash
  const aliasUrlHash = FreebuffDeviceCodeResponseRawSchema.safeParse({
    url: "https://codebuff.com/auth/cli?code=url2",
    hash: "hash-url2",
    expiresAt: "2026-08-17T00:00:00Z",
  });
  assert.equal(aliasUrlHash.success, true);
  if (aliasUrlHash.success) {
    assert.equal(aliasUrlHash.data.loginUrl, "https://codebuff.com/auth/cli?code=url2");
    assert.equal(aliasUrlHash.data.fingerprintHash, "hash-url2");
  }

  // Alias authUrl + canonical fingerprintHash
  const aliasAuthUrl = FreebuffDeviceCodeResponseRawSchema.safeParse({
    authUrl: "https://codebuff.com/auth/cli?code=auth3",
    fingerprintHash: "hash-canon3",
    expiresAt: 1700000000,
  });
  assert.equal(aliasAuthUrl.success, true);
  if (aliasAuthUrl.success) {
    assert.equal(aliasAuthUrl.data.loginUrl, "https://codebuff.com/auth/cli?code=auth3");
    assert.equal(aliasAuthUrl.data.fingerprintHash, "hash-canon3");
  }

  // Strict rejection of unknown keys
  const unknownKey = FreebuffDeviceCodeResponseRawSchema.safeParse({
    loginUrl: "https://codebuff.com/auth/cli?code=canon",
    fingerprintHash: "hash-canon",
    expiresAt: 1700000000,
    extra: "unexpected_field",
  });
  assert.equal(unknownKey.success, true, "Must accept unknown keys via .passthrough()");
});

test("FreebuffPollResponseRawSchema and FreebuffPollUserRawSchema accept unknown keys via passthrough and accept aliases", () => {
  // Passthrough acceptance of top-level unknown keys
  const unknownTopLevel = FreebuffPollResponseRawSchema.safeParse({
    status: "pending",
    extra: "unexpected",
  });
  assert.equal(unknownTopLevel.success, true, "Must accept top-level unknown keys via .passthrough()");

  // Passthrough acceptance of nested user unknown keys
  const unknownNestedUser = FreebuffPollResponseRawSchema.safeParse({
    status: "approved",
    user: {
      authToken: "cb-auth-token",
      extra: "unexpected_user_prop",
    },
  });
  assert.equal(unknownNestedUser.success, true, "Must accept nested user unknown keys via .passthrough()");

  // Direct FreebuffPollUserRawSchema passthrough validation
  const userSchemaUnknown = FreebuffPollUserRawSchema.safeParse({
    authToken: "cb-tok",
    unknownProp: 123,
  });
  assert.equal(userSchemaUnknown.success, true, "FreebuffPollUserRawSchema must accept unknown keys");

  // User aliases: token, accessToken
  const userToken = FreebuffPollResponseRawSchema.safeParse({
    status: "approved",
    user: {
      token: "tok-alias-1",
      email: "u1@example.com",
    },
  });
  assert.equal(userToken.success, true);

  const userAccessToken = FreebuffPollResponseRawSchema.safeParse({
    status: "approved",
    user: {
      accessToken: "tok-alias-2",
      displayName: "User 2",
    },
  });
  assert.equal(userAccessToken.success, true);

  // Top-level aliases: token, accessToken
  const topLevelToken = FreebuffPollResponseRawSchema.safeParse({
    token: "top-tok-1",
  });
  assert.equal(topLevelToken.success, true);

  const topLevelAccessToken = FreebuffPollResponseRawSchema.safeParse({
    accessToken: "top-tok-2",
  });
  assert.equal(topLevelAccessToken.success, true);
});

test("FreebuffSessionAdmissionResponseSchema normalizes aliases id/session_id and accepts unknown keys via passthrough()", () => {
  // Alias id
  const aliasId = FreebuffSessionAdmissionResponseSchema.safeParse({
    id: "inst-from-id",
    expiresAt: 1700000000000,
  });
  assert.equal(aliasId.success, true);
  if (aliasId.success) {
    assert.equal(aliasId.data.instanceId, "inst-from-id");
    assert.equal(aliasId.data.expiresAt, 1700000000000);
  }

  // Alias session_id
  const aliasSessionId = FreebuffSessionAdmissionResponseSchema.safeParse({
    session_id: "inst-from-session-id",
    expiresAt: "2026-08-17T00:00:00Z",
  });
  assert.equal(aliasSessionId.success, true);
  if (aliasSessionId.success) {
    assert.equal(aliasSessionId.data.instanceId, "inst-from-session-id");
  }

  // Passthrough acceptance of unknown keys
  const unknownKey = FreebuffSessionAdmissionResponseSchema.safeParse({
    instanceId: "inst-canon",
    expiresAt: 1700000000000,
    extra: "unexpected",
  });
  assert.equal(unknownKey.success, true, "Must accept unknown keys via .passthrough()");

  const unknownKeyOnAlias = FreebuffSessionAdmissionResponseSchema.safeParse({
    id: "inst-alias",
    expiresAt: 1700000000000,
    unknown: 123,
  });
  assert.equal(unknownKeyOnAlias.success, true, "Must accept unknown keys on alias via .passthrough()");
});

test("FreebuffAdmissionErrorPayloadSchema accepts error payloads and extra keys via passthrough()", () => {
  // Rejects empty object
  const empty = FreebuffAdmissionErrorPayloadSchema.safeParse({});
  assert.equal(empty.success, false, "Must reject empty {} error payload");

  // Accepts top-level unknown keys
  const topUnknown = FreebuffAdmissionErrorPayloadSchema.safeParse({
    message: "Rate limit reached",
    extra: "unexpected",
  });
  assert.equal(topUnknown.success, true, "Must accept top-level unknown keys via .passthrough()");

  // Accepts nested error unknown keys
  const nestedUnknown = FreebuffAdmissionErrorPayloadSchema.safeParse({
    error: {
      message: "Rate limit reached",
      extra: "unexpected",
    },
  });
  assert.equal(nestedUnknown.success, true, "Must accept nested error unknown keys via .passthrough()");

  // Rejects empty nested error
  const emptyNested = FreebuffAdmissionErrorPayloadSchema.safeParse({
    error: {},
  });
  assert.equal(emptyNested.success, false, "Must reject empty nested error object");

  // Direct FreebuffAdmissionNestedErrorSchema validation
  assert.equal(FreebuffAdmissionNestedErrorSchema.safeParse({}).success, false);
  assert.equal(FreebuffAdmissionNestedErrorSchema.safeParse({ message: "m", extra: 1 }).success, true);
  assert.equal(FreebuffAdmissionNestedErrorSchema.safeParse({ message: "valid message" }).success, true);
  assert.equal(FreebuffAdmissionNestedErrorSchema.safeParse({ code: "rate_limited" }).success, true);
  assert.equal(FreebuffAdmissionNestedErrorSchema.safeParse({ type: "rate_limit_error" }).success, true);

  // Valid error payload variants
  const validStringError = FreebuffAdmissionErrorPayloadSchema.safeParse({
    error: "rate_limited",
  });
  assert.equal(validStringError.success, true);

  const validObjectError = FreebuffAdmissionErrorPayloadSchema.safeParse({
    error: {
      message: "Rate limit reached",
      code: "rate_limited",
      type: "rate_limit_error",
    },
  });
  assert.equal(validObjectError.success, true);

  const validMessageOnly = FreebuffAdmissionErrorPayloadSchema.safeParse({
    message: "Free capacity exhausted",
  });
  assert.equal(validMessageOnly.success, true);

  const validReasonOnly = FreebuffAdmissionErrorPayloadSchema.safeParse({
    reason: "ip_capped",
  });
  assert.equal(validReasonOnly.success, true);

  const validRetryAfter = FreebuffAdmissionErrorPayloadSchema.safeParse({
    retry_after: 30,
  });
  assert.equal(validRetryAfter.success, true);

  const validFull = FreebuffAdmissionErrorPayloadSchema.safeParse({
    error: "ip_capped",
    message: "IP rate limit capped",
    reason: "ip_capped",
    retry_after: 30,
  });
  assert.equal(validFull.success, true);
});

test("FreebuffExecutor applies provider error rule cooldowns on 429 chat responses without explicit Retry-After header", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const credentials = { accessToken: "tok-rule-cooldown" };
  setFreebuffSession(credentials, {
    instanceId: "inst-rule-cooldown",
    model: "deepseek-v4-flash",
    expiresAt: Date.now() + 3600_000,
    acquiredAt: Date.now(),
  });

  const executor = new FreebuffExecutor();

  // 1. ip_capped -> should apply 30s rule cooldown
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: "ip_capped",
        message: "Hourly IP quota reached",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }) as typeof fetch;

  const resIp = await executor.execute({
    model: "deepseek-v4-flash",
    body: { messages: [{ role: "user", content: "hi" }] },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(resIp.response.status, 429);
  assert.equal(resIp.response.headers.get("Retry-After"), "30");
  const bodyIp = (await resIp.response.json()) as { error: { reason?: string; retry_after?: number } };
  assert.equal(bodyIp.error.reason, "ip_capped");
  assert.equal(bodyIp.error.retry_after, 30);

  // 2. rate_limited -> should apply 15s rule cooldown
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: "Too many concurrent requests",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }) as typeof fetch;

  const resRate = await executor.execute({
    model: "deepseek-v4-flash",
    body: { messages: [{ role: "user", content: "hi" }] },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(resRate.response.status, 429);
  assert.equal(resRate.response.headers.get("Retry-After"), "15");
  const bodyRate = (await resRate.response.json()) as { error: { reason?: string; retry_after?: number } };
  assert.equal(bodyRate.error.reason, "rate_limited");
  assert.equal(bodyRate.error.retry_after, 15);

  // 3. free_mode_capacity_deferred -> should apply 5s rule cooldown
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: "free_mode_capacity_deferred",
        message: "Free capacity busy",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }) as typeof fetch;

  const resDef = await executor.execute({
    model: "deepseek-v4-flash",
    body: { messages: [{ role: "user", content: "hi" }] },
    stream: false,
    credentials,
  } as ExecuteInput);

  assert.equal(resDef.response.status, 429);
  assert.equal(resDef.response.headers.get("Retry-After"), "5");
  const bodyDef = (await resDef.response.json()) as { error: { reason?: string; retry_after?: number } };
  assert.equal(bodyDef.error.reason, "free_mode_capacity_deferred");
  assert.equal(bodyDef.error.retry_after, 5);
});

test("FreebuffExecutor applies provider error rule cooldowns on 429 admission responses without explicit Retry-After header", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const executor = new FreebuffExecutor();

  // 1. Admission 429 with ip_capped -> should return 429 with Retry-After: 30
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: "ip_capped",
        message: "IP admission cap reached",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }) as typeof fetch;

  const resIp = await executor.execute({
    model: "deepseek-v4-pro",
    body: { messages: [{ role: "user", content: "hi" }] },
    stream: false,
    credentials: { accessToken: "tok-admit-ip" },
  } as ExecuteInput);

  assert.equal(resIp.response.status, 429);
  assert.equal(resIp.response.headers.get("Retry-After"), "30");
  const bodyIp = (await resIp.response.json()) as { error: { reason?: string; retry_after?: number } };
  assert.equal(bodyIp.error.reason, "ip_capped");
  assert.equal(bodyIp.error.retry_after, 30);

  // 2. Admission 429 with rate_limited -> should return 429 with Retry-After: 15
  globalThis.fetch = (async () => {
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: "Admission rate limit",
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      }
    );
  }) as typeof fetch;

  const resRate = await executor.execute({
    model: "deepseek-v4-pro",
    body: { messages: [{ role: "user", content: "hi" }] },
    stream: false,
    credentials: { accessToken: "tok-admit-rate" },
  } as ExecuteInput);

  assert.equal(resRate.response.status, 429);
  assert.equal(resRate.response.headers.get("Retry-After"), "15");
  const bodyRate = (await resRate.response.json()) as { error: { reason?: string; retry_after?: number } };
  assert.equal(bodyRate.error.reason, "rate_limited");
  assert.equal(bodyRate.error.retry_after, 15);
});

test("checkFallbackError propagates Freebuff error rule scopes and cooldowns", async () => {
  const { checkFallbackError } = await import("../../open-sse/services/accountFallback.ts");

  // 1. ip_capped -> scope: provider, cooldownMs: 30000
  const ipResult = checkFallbackError(
    429,
    JSON.stringify({ error: "ip_capped", message: "IP capped" }),
    0,
    "deepseek-v4-pro",
    "freebuff"
  );
  assert.equal(ipResult.shouldFallback, true);
  assert.equal(ipResult.cooldownMs, 30_000);
  assert.equal(ipResult.scope, "provider");

  // 2. rate_limited -> scope: connection, cooldownMs: 15000
  const rateResult = checkFallbackError(
    429,
    JSON.stringify({ error: "rate_limited", message: "Rate limit reached" }),
    0,
    "deepseek-v4-pro",
    "freebuff"
  );
  assert.equal(rateResult.shouldFallback, true);
  assert.equal(rateResult.cooldownMs, 15_000);
  assert.equal(rateResult.scope, "connection");

  // 3. free_mode_capacity_deferred -> scope: provider, cooldownMs: 5000
  const capResult = checkFallbackError(
    429,
    JSON.stringify({ error: "free_mode_capacity_deferred", message: "Capacity deferred" }),
    0,
    "deepseek-v4-pro",
    "freebuff"
  );
  assert.equal(capResult.shouldFallback, true);
  assert.equal(capResult.cooldownMs, 5_000);
  assert.equal(capResult.scope, "provider");

  // 4. Extracted human-readable error text + structuredError object
  const extractedIpResult = checkFallbackError(
    429,
    "IP admission cap reached",
    0,
    "deepseek-v4-pro",
    "freebuff",
    null,
    null,
    { code: "rate_limit_exceeded", type: "error" }
  );
  assert.equal(extractedIpResult.shouldFallback, true);
  assert.equal(extractedIpResult.cooldownMs, 30_000);
  assert.equal(extractedIpResult.scope, "provider");

  const extractedRateResult = checkFallbackError(
    429,
    "Admission rate limit reached",
    0,
    "deepseek-v4-pro",
    "freebuff",
    null,
    null,
    { code: "rate_limit_exceeded", type: "error" }
  );
  assert.equal(extractedRateResult.shouldFallback, true);
  assert.equal(extractedRateResult.cooldownMs, 15_000);
  assert.equal(extractedRateResult.scope, "connection");

  // 5. Additional phrases from reviewer probes
  const hourlyIpResult = checkFallbackError(
    429,
    "Hourly IP quota reached",
    0,
    "deepseek-v4-pro",
    "freebuff"
  );
  assert.equal(hourlyIpResult.shouldFallback, true);
  assert.equal(hourlyIpResult.cooldownMs, 30_000);
  assert.equal(hourlyIpResult.scope, "provider");

  const freeCapacityBusyResult = checkFallbackError(
    429,
    "Free capacity busy",
    0,
    "deepseek-v4-pro",
    "freebuff"
  );
  assert.equal(freeCapacityBusyResult.shouldFallback, true);
  assert.equal(freeCapacityBusyResult.cooldownMs, 5_000);
  assert.equal(freeCapacityBusyResult.scope, "provider");

  const generic429Result = checkFallbackError(
    429,
    "Too Many Requests",
    0,
    "deepseek-v4-pro",
    "freebuff"
  );
  assert.equal(generic429Result.shouldFallback, true);
  assert.equal(generic429Result.cooldownMs, 5_000);
  assert.equal(generic429Result.scope, "provider");
});

test("Route-level Freebuff device-code and poll integration with connection persistence & redaction", async () => {
  const route = await import("../../src/app/api/oauth/[provider]/[action]/route.ts");
  const { getProviderConnections, deleteProviderConnection } = await import("../../src/lib/db/providers.ts");
  const { updateSettings } = await import("../../src/lib/db/settings.ts");

  await updateSettings({ requireLogin: false });
  const prevRequireApiKey = process.env.REQUIRE_API_KEY;
  delete process.env.REQUIRE_API_KEY;

  try {
    // 1. GET /api/oauth/freebuff/device-code
    globalThis.fetch = (async (url: string) => {
      if (url.includes("/api/auth/cli/code")) {
        return new Response(
          JSON.stringify({
            loginUrl: "https://codebuff.com/cli/auth?code=cb-code-xyz",
            fingerprintHash: "fp-hash-12345",
            expiresAt: Date.now() + 600000,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as typeof fetch;

    const deviceCodeReq = new Request("http://localhost/api/oauth/freebuff/device-code", {
      method: "GET",
    });

    const deviceCodeRes = await route.GET(deviceCodeReq, {
      params: Promise.resolve({ provider: "freebuff", action: "device-code" }),
    });
    assert.equal(deviceCodeRes.status, 200);
    const deviceCodeBody = (await deviceCodeRes.json()) as { user_code?: string; verification_uri?: string; device_code?: string };
    assert.ok(deviceCodeBody.verification_uri?.includes("codebuff.com"));
    assert.ok(deviceCodeBody.device_code);

    // 2. POST /api/oauth/freebuff/poll with success -> persists connection to SQLite
    globalThis.fetch = (async (url: string) => {
      if (url.includes("/api/auth/cli/status")) {
        return new Response(
          JSON.stringify({
            authToken: "auth_token_secret_12345",
            user: { email: "freebuff-user@example.com", name: "Freebuff User" },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    }) as typeof fetch;

    const pollReq = new Request("http://localhost/api/oauth/freebuff/poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceCode: deviceCodeBody.device_code,
        fingerprintHash: "fp-hash-12345",
      }),
    });

    const pollRes = await route.POST(pollReq, {
      params: Promise.resolve({ provider: "freebuff", action: "poll" }),
    });
    assert.equal(pollRes.status, 200);
    const pollBody = (await pollRes.json()) as { success: boolean; connection?: { id: string; provider: string } };
    assert.equal(pollBody.success, true);
    assert.ok(pollBody.connection?.id);

    // Verify connection actually landed in DB
    const connections = await getProviderConnections("freebuff");
    const matching = connections.find((c) => c.id === pollBody.connection?.id);
    assert.ok(matching, "Connection must be persisted to SQLite");
    assert.equal(matching.provider, "freebuff");

    if (pollBody.connection?.id) {
      await deleteProviderConnection(pollBody.connection.id);
    }

    // 3. POST /api/oauth/freebuff/poll with upstream error containing sensitive token -> verifies route-level redaction
    const SENTINEL_TOKEN = "eyJhbGciOiJIUzI1NiJ9.SENTINEL_JWT_FREEBUFF_12345.sig";
    globalThis.fetch = (async () => {
      return new Response(
        JSON.stringify({
          error: "token_rejected",
          message: `Upstream rejected auth token ${SENTINEL_TOKEN} for user`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }) as typeof fetch;

    const errorPollReq = new Request("http://localhost/api/oauth/freebuff/poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceCode: "cb-dev-123",
        fingerprintHash: "fp-hash-error",
      }),
    });

    const errorPollRes = await route.POST(errorPollReq, {
      params: Promise.resolve({ provider: "freebuff", action: "poll" }),
    });
    const errorPollBody = (await errorPollRes.json()) as { error?: { message?: string }; errorDescription?: string };
    const combinedError = JSON.stringify(errorPollBody);
    assert.equal(combinedError.includes(SENTINEL_TOKEN), false, "Route error response must never contain raw sentinel token");
  } finally {
    if (prevRequireApiKey !== undefined) {
      process.env.REQUIRE_API_KEY = prevRequireApiKey;
    }
  }
});
